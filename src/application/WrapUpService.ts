import {
  DayPlanStatus,
  Status,
  calculateDailyWrapUpMetrics,
  createDailyWrapUp,
  createDayPlan,
  getFocusElapsedSeconds,
  getProjectForItem,
  isProject,
  isTask,
  updateDayPlan,
  type CalendarDate,
  type Item,
} from "../domain";
import type { CalendarProvider } from "@/calendar";
import type {
  DailyWrapUpData,
  WrapUpFeature,
  WrapUpTaskEvidence,
} from "@/features/contracts/WrapUpFeature";
import type { DailyWrapUpReflection } from "@/domain";
import type { DayPlanRepository } from "@/repositories/DayPlanRepository";
import type { DailyWrapUpRepository } from "@/repositories/DailyWrapUpRepository";
import type { ItemRepository } from "@/repositories/ItemRepository";

type WrapUpContext = {
  readonly locale: string;
  readonly now?: Date;
  readonly timeZone: string;
  readonly userName: string;
};

function flattenItems(items: readonly Item[]): readonly Item[] {
  const result: Item[] = [];
  const seen = new Set<string>();
  function visit(item: Item) {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    result.push(item);
    item.children.forEach(visit);
  }
  items.forEach(visit);
  return result;
}

function getCalendarDate(now: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function nextCalendarDate(date: CalendarDate): CalendarDate {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function toZonedInstant(date: CalendarDate, minute: number, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day, Math.floor(minute / 60), minute % 60);
  let candidate = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(candidate));
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((entry) => entry.type === type)?.value ?? 0);
    const represented = Date.UTC(
      part("year"), part("month") - 1, part("day"), part("hour"), part("minute"),
    );
    const adjustment = target - represented;
    candidate += adjustment;
    if (adjustment === 0) return new Date(candidate);
  }
  throw new Error("The Daily Wrap-Up date cannot be represented in this time zone.");
}

/** Assembles end-of-day evidence and persists only confirmed reflection choices. */
class WrapUpService implements WrapUpFeature {
  constructor(
    private readonly wrapUps: DailyWrapUpRepository,
    private readonly plans: DayPlanRepository,
    private readonly items: ItemRepository,
    private readonly calendar: CalendarProvider,
    private readonly context: WrapUpContext,
  ) {}

  async loadWrapUp(): Promise<DailyWrapUpData> {
    const now = this.context.now ?? new Date();
    const date = getCalendarDate(now, this.context.timeZone);
    const [review, plan, rootItems, calendar] = await Promise.all([
      this.wrapUps.get(date),
      this.plans.get(date),
      this.items.get(),
      this.calendar.getEvents({
        end: toZonedInstant(date, 24 * 60, this.context.timeZone),
        start: toZonedInstant(date, 0, this.context.timeZone),
        timeZone: this.context.timeZone,
      }),
    ]);
    const allItems = flattenItems(rootItems);
    const projects = allItems.filter(isProject);
    const taskById = new Map(allItems.filter(isTask).map((task) => [task.id, task]));
    const commitmentById = new Map(
      (plan?.commitments ?? []).map((commitment) => [commitment.taskId, commitment]),
    );
    const tasks = (plan?.taskIds ?? []).flatMap((taskId): WrapUpTaskEvidence[] => {
      const task = taskById.get(taskId);
      if (!task) return [];
      const elapsedSeconds = commitmentById.has(taskId)
        ? getFocusElapsedSeconds(commitmentById.get(taskId)!.session, now)
        : 0;
      return [{
        actualDurationSeconds: elapsedSeconds > 0 ? elapsedSeconds : null,
        completed: task.status === Status.Completed,
        estimatedDurationMinutes: task.estimatedDuration ?? task.durationMinutes ?? null,
        id: task.id,
        projectTitle: getProjectForItem(task, projects)?.title ?? null,
        title: task.title,
      }];
    });
    const plannedMinutes = (plan?.timeBlocks ?? []).reduce(
      (total, block) => total + block.end - block.start,
      0,
    );
    const metrics = calculateDailyWrapUpMetrics(tasks, {
      calendarEventCount: calendar.events.length,
      plannedMinutes,
      plannedTimeBlockCount: plan?.timeBlocks.length ?? 0,
    });
    return {
      calendar: { ...calendar, timeZone: this.context.timeZone },
      completedTasks: tasks.filter(({ completed }) => completed),
      dateLabel: new Intl.DateTimeFormat(this.context.locale, {
        day: "numeric",
        month: "long",
        timeZone: this.context.timeZone,
        weekday: "long",
      }).format(now),
      incompleteTasks: tasks.filter(({ completed }) => !completed),
      metrics: review?.metrics ?? metrics,
      name: this.context.userName,
      review,
      timeBlocks: (plan?.timeBlocks ?? []).map((block) => ({
        end: block.end,
        id: block.id,
        linkedTaskTitles: block.linkedTasks.flatMap((id) => {
          const task = taskById.get(id);
          return task ? [task.title] : [];
        }),
        start: block.start,
        title: block.title,
        type: block.type,
      })),
    };
  }

  async completeWrapUp(input: DailyWrapUpReflection): Promise<DailyWrapUpData> {
    const data = await this.loadWrapUp();
    if (data.review) throw new Error("This day already has a Daily Wrap-Up.");
    const now = this.context.now ?? new Date();
    const date = getCalendarDate(now, this.context.timeZone);
    const review = createDailyWrapUp({
      ...input,
      calendarEventCount: data.calendar.events.length,
      createdAt: now,
      date,
      plannedMinutes: data.metrics.plannedMinutes,
      plannedTimeBlockCount: data.timeBlocks.length,
      tasks: [...data.completedTasks, ...data.incompleteTasks].map((task) => ({
        actualDurationSeconds: task.actualDurationSeconds,
        completed: task.completed,
        estimatedDurationMinutes: task.estimatedDurationMinutes,
        taskId: task.id,
        title: task.title,
      })),
    });
    const carryIds = review.tasks.filter(({ carriedForward }) => carriedForward)
      .map(({ taskId }) => taskId);
    if (carryIds.length > 0) {
      const tomorrow = nextCalendarDate(date);
      const nextPlan = (await this.plans.get(tomorrow)) ?? createDayPlan({
        createdAt: now,
        date: tomorrow,
        id: `day-plan-${tomorrow}`,
        timeZone: this.context.timeZone,
      });
      if (nextPlan.status === DayPlanStatus.Started) {
        throw new Error("Tomorrow's day has already started and cannot receive carry-forward Tasks.");
      }
      await this.plans.save(updateDayPlan(nextPlan, {
        taskIds: [...nextPlan.taskIds, ...carryIds],
      }, now));
    }
    await this.wrapUps.save(review);
    return this.loadWrapUp();
  }
}

export { WrapUpService };
export type { WrapUpContext };
