import {
  ItemType,
  DEFAULT_PLANNING_SUGGESTION_LIMIT,
  DayPlanStatus,
  Status,
  clearTaskSchedule,
  createDayPlan,
  createTimeBlock as createDomainTimeBlock,
  duplicateTimeBlock as duplicateDomainTimeBlock,
  getProjectForItem,
  isProject,
  isTask,
  mergeTimeBlocks as mergeDomainTimeBlocks,
  splitTimeBlock as splitDomainTimeBlock,
  setTaskSchedule,
  updateDayPlan,
  updateTimeBlock as updateDomainTimeBlock,
  type Area,
  type CalendarDate,
  type DayPlan,
  type Item,
  type Project,
  type PlanningRulesEngine,
  type Task,
} from "../domain";
import type {
  DailyPlannerData,
  PlannerFeature,
  PlannerProject,
  PlannerTask,
  TimeBlockUpdateInput,
  TimeBlockWriteInput,
} from "@/features/contracts/PlannerFeature";
import type { AreaRepository } from "@/repositories/AreaRepository";
import type { DailyReviewRepository } from "@/repositories/DailyReviewRepository";
import type { DayPlanRepository } from "@/repositories/DayPlanRepository";
import type { ItemRepository } from "@/repositories/ItemRepository";
import type { CalendarProvider } from "@/calendar";

const DEFAULT_AVAILABLE_MINUTES = 8 * 60;

type PlannerContext = {
  readonly currentContext?: string | null;
  readonly locale: string;
  readonly now?: Date;
  readonly timeZone: string;
  readonly userName: string;
};

type IdGenerator = () => string;

function flattenItems(items: readonly Item[]): readonly Item[] {
  const flattened: Item[] = [];
  const seen = new Set<string>();
  function visit(item: Item) {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    flattened.push(item);
    item.children.forEach(visit);
  }
  items.forEach(visit);
  return flattened;
}

function getCalendarDate(context: PlannerContext): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: context.timeZone,
    year: "numeric",
  }).formatToParts(context.now ?? new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function toZonedInstant(
  date: CalendarDate,
  minute: number,
  timeZone: string,
): Date {
  const [year, month, day] = date.split("-").map(Number);
  const hour = Math.floor(minute / 60);
  const minuteOfHour = minute % 60;
  const target = Date.UTC(year, month - 1, day, hour, minuteOfHour);
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
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
    );
    const adjustment = target - represented;
    candidate += adjustment;
    if (adjustment === 0) return new Date(candidate);
  }

  throw new Error("That local time does not exist in the Day Plan time zone.");
}

function isPoolTask(task: Task, projects: readonly Project[]): boolean {
  if (![Status.Active, Status.Today].includes(task.status)) return false;
  const project = getProjectForItem(task, projects);
  return project === null || project.status === Status.Active;
}

function compareCandidates(left: Task, right: Task, date: CalendarDate): number {
  const leftScheduled = left.scheduledDate === date ? 1 : 0;
  const rightScheduled = right.scheduledDate === date ? 1 : 0;
  return (
    rightScheduled - leftScheduled ||
    (left.dueDate ?? "9999-12-31").localeCompare(right.dueDate ?? "9999-12-31") ||
    right.attentionScore - left.attentionScore ||
    left.energyCost - right.energyCost ||
    left.createdAt.getTime() - right.createdAt.getTime() ||
    left.id.localeCompare(right.id)
  );
}

/** Owns date-scoped planning reads and every explicit Day Plan mutation. */
class PlannerService implements PlannerFeature {
  constructor(
    private readonly plans: DayPlanRepository,
    private readonly items: ItemRepository,
    private readonly areas: AreaRepository,
    private readonly reviews: DailyReviewRepository,
    private readonly planningRules: PlanningRulesEngine,
    private readonly calendar: CalendarProvider,
    private readonly createId: IdGenerator,
    private readonly context: PlannerContext,
  ) {}

  async loadPlanner(): Promise<DailyPlannerData> {
    const date = getCalendarDate(this.context);
    const [rootItems, areas, latestReview, storedPlan, calendar] = await Promise.all([
      this.items.get(),
      this.areas.get(),
      this.reviews.get(),
      this.plans.get(date),
      this.calendar.getEvents({
        end: toZonedInstant(date, 24 * 60, this.context.timeZone),
        start: toZonedInstant(date, 0, this.context.timeZone),
        timeZone: this.context.timeZone,
      }),
    ]);
    const allItems = flattenItems(rootItems);
    const tasks = allItems.filter(isTask);
    const projects = allItems.filter(isProject);
    const activeProjects = projects.filter(({ status }) => status === Status.Active);
    const inbox = allItems
      .filter(
        (item) => item.type !== ItemType.Project && item.status === Status.Inbox,
      )
      .sort((left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime() ||
        left.id.localeCompare(right.id),
      );
    const plan = storedPlan ?? this.createLegacyPlan(date, tasks);
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const commitmentTasks = plan.taskIds
      .map((id) => taskById.get(id))
      .filter((task): task is Task =>
        Boolean(task && ![Status.Completed, Status.Archived].includes(task.status)),
      );
    const commitmentIds = new Set(commitmentTasks.map(({ id }) => id));
    const poolTasks = tasks
      .filter((task) => isPoolTask(task, projects) && !commitmentIds.has(task.id))
      .sort((left, right) => compareCandidates(left, right, date));
    const review = latestReview?.date === date ? latestReview : null;
    const plannerTasks = new Map(
      tasks.map((task) => [task.id, this.toPlannerTask(task, areas, projects)]),
    );
    const plannedMinutes = plan.timeBlocks.reduce(
      (total, block) => total + block.end - block.start,
      0,
    );
    const remainingMinutes = Math.max(DEFAULT_AVAILABLE_MINUTES - plannedMinutes, 0);
    const suggestionLimit = review
      ? Math.min(
          DEFAULT_PLANNING_SUGGESTION_LIMIT,
          Math.max(1, Math.ceil(review.attentionBudget / 35)),
        )
      : DEFAULT_PLANNING_SUGGESTION_LIMIT;
    const suggestions = this.planningRules.getSuggestions({
      availableMinutes: remainingMinutes,
      currentContext: this.context.currentContext,
      date,
      excludedTaskIds: [...commitmentIds],
      items: rootItems,
      limit: suggestionLimit,
    }).flatMap(({ reason, task }) => {
      const plannerTask = plannerTasks.get(task.id);
      return plannerTask ? [{ reason, task: plannerTask }] : [];
    });

    return {
      attention: review
        ? {
            budget: review.attentionBudget,
            energy: review.energy,
            motivation: review.motivation,
            stress: review.stress,
            summary: review.summary,
          }
        : null,
      availableTime: {
        plannedMinutes,
        remainingMinutes,
        totalMinutes: DEFAULT_AVAILABLE_MINUTES,
      },
      calendar: { ...calendar, timeZone: this.context.timeZone },
      commitments: commitmentTasks.map((task) => plannerTasks.get(task.id)!),
      inbox: inbox.map(({ createdAt, id, title }) => ({ createdAt, id, title })),
      morning: {
        activeProjectCount: activeProjects.length,
        availableTaskCount: poolTasks.length,
        date,
        dateLabel: new Intl.DateTimeFormat(this.context.locale, {
          day: "numeric",
          month: "long",
          timeZone: this.context.timeZone,
          weekday: "long",
        }).format(this.context.now ?? new Date()),
        inboxCount: inbox.length,
        name: this.context.userName,
      },
      plan: {
        persisted: storedPlan !== null,
        status: plan.status,
        updatedAt: plan.updatedAt,
      },
      projects: activeProjects.map((project) => this.toPlannerProject(project)),
      suggestions,
      taskPool: poolTasks.map((task) => plannerTasks.get(task.id)!),
      timeBlocks: plan.timeBlocks.map((block) => ({
        end: block.end,
        id: block.id,
        linkedProjects: block.linkedProjects.flatMap((id) => {
          const project = projects.find((candidate) => candidate.id === id);
          return project ? [this.toPlannerProject(project)] : [];
        }),
        linkedTasks: block.linkedTasks.flatMap((id) => {
          const task = plannerTasks.get(id);
          return task ? [task] : [];
        }),
        locked: block.locked,
        notes: block.notes,
        start: block.start,
        title: block.title,
        type: block.type,
      })),
    };
  }

  async placeTask(taskId: string, beforeTaskId?: string | null) {
    const { plan, tasks, projects } = await this.getMutableContext();
    const task = tasks.find(({ id }) => id === taskId);
    if (!task || !isPoolTask(task, projects)) {
      throw new Error("Only available Tasks can be added to today's plan.");
    }
    const taskIds = plan.taskIds.filter((id) => id !== taskId);
    const targetIndex = beforeTaskId ? taskIds.indexOf(beforeTaskId) : -1;
    taskIds.splice(targetIndex >= 0 ? targetIndex : taskIds.length, 0, taskId);
    await this.plans.save(updateDayPlan(plan, { taskIds }));
    return this.loadPlanner();
  }

  async saveDraft() {
    const { plan } = await this.getMutableContext();
    if (plan.status === DayPlanStatus.Started) return this.loadPlanner();
    await this.plans.save(updateDayPlan(plan, { status: DayPlanStatus.Draft }));
    return this.loadPlanner();
  }

  async startDay() {
    const { plan } = await this.getMutableContext();
    await this.plans.save(updateDayPlan(plan, { status: DayPlanStatus.Started }));
    return this.loadPlanner();
  }

  async placeTasks(taskIds: readonly string[]) {
    const { plan, tasks, projects } = await this.getMutableContext();
    const uniqueIds = [...new Set(taskIds)];
    const availableIds = new Set(
      tasks.filter((task) => isPoolTask(task, projects)).map(({ id }) => id),
    );
    if (uniqueIds.some((id) => !availableIds.has(id))) {
      throw new Error("Only available Tasks can be added to today's plan.");
    }
    const accepted = new Set(plan.taskIds);
    const additions = uniqueIds.filter((id) => !accepted.has(id));
    if (additions.length > 0) {
      await this.plans.save(updateDayPlan(plan, {
        taskIds: [...plan.taskIds, ...additions],
      }));
    }
    return this.loadPlanner();
  }

  async removeTask(taskId: string) {
    const { plan, rootItems } = await this.getMutableContext();
    await this.persistScheduledPlan(
      updateDayPlan(plan, {
        taskIds: plan.taskIds.filter((id) => id !== taskId),
        timeBlocks: plan.timeBlocks.map((block) =>
          updateDomainTimeBlock(block, {
            linkedTasks: block.linkedTasks.filter((id) => id !== taskId),
          }),
        ),
      }),
      rootItems,
    );
    return this.loadPlanner();
  }

  async moveTask(taskId: string, direction: "down" | "up") {
    const { plan } = await this.getMutableContext();
    const taskIds = [...plan.taskIds];
    const index = taskIds.indexOf(taskId);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0) throw new Error("The Task is not in today's plan.");
    if (nextIndex >= 0 && nextIndex < taskIds.length) {
      [taskIds[index], taskIds[nextIndex]] = [taskIds[nextIndex], taskIds[index]];
      await this.plans.save(updateDayPlan(plan, { taskIds }));
    }
    return this.loadPlanner();
  }

  async createTimeBlock(input: TimeBlockWriteInput) {
    const { plan, projects, rootItems, tasks } = await this.getMutableContext();
    const linkedTasks = this.resolveTasks(input.linkedTaskIds ?? [], tasks, projects);
    const linkedProjects = this.resolveProjects(
      input.linkedProjectIds ?? [],
      projects,
    );
    const block = createDomainTimeBlock(
      this.createId(),
      {
        end: input.end,
        linkedProjects: linkedProjects.map(({ id }) => id),
        linkedTasks: linkedTasks.map(({ id }) => id),
        locked: input.locked ?? false,
        notes: input.notes ?? null,
        start: input.start,
        title: input.title.trim() || linkedTasks[0]?.title || "",
        type: input.type,
      },
    );
    await this.persistScheduledPlan(
      updateDayPlan(plan, {
        taskIds: [...plan.taskIds, ...linkedTasks.map(({ id }) => id)],
        timeBlocks: [...plan.timeBlocks, block],
      }),
      rootItems,
    );
    return this.loadPlanner();
  }

  async updateTimeBlock(blockId: string, input: TimeBlockUpdateInput) {
    const { plan } = await this.getMutableContext();
    const block = this.getTimeBlock(plan, blockId);
    const updated = updateDomainTimeBlock(block, {
      notes: input.notes ?? null,
      title: input.title.trim() || block.title,
      type: input.type,
    });
    await this.saveBlock(plan, updated);
    return this.loadPlanner();
  }

  async moveTimeBlock(blockId: string, start: number) {
    const { plan, rootItems } = await this.getMutableContext();
    const block = this.getTimeBlock(plan, blockId);
    await this.persistScheduledPlan(
      this.replaceBlock(plan, updateDomainTimeBlock(block, {
        end: start + block.end - block.start,
        start,
      })),
      rootItems,
    );
    return this.loadPlanner();
  }

  async resizeTimeBlock(blockId: string, end: number) {
    const { plan, rootItems } = await this.getMutableContext();
    const block = this.getTimeBlock(plan, blockId);
    await this.persistScheduledPlan(
      this.replaceBlock(plan, updateDomainTimeBlock(block, { end })),
      rootItems,
    );
    return this.loadPlanner();
  }

  async setTimeBlockLocked(blockId: string, locked: boolean) {
    const { plan } = await this.getMutableContext();
    const block = this.getTimeBlock(plan, blockId);
    await this.saveBlock(plan, updateDomainTimeBlock(block, { locked }));
    return this.loadPlanner();
  }

  async deleteTimeBlock(blockId: string) {
    const { plan, rootItems } = await this.getMutableContext();
    const block = this.getTimeBlock(plan, blockId);
    if (block.locked) throw new Error("Unlock the Time Block before deleting it.");
    await this.persistScheduledPlan(
      updateDayPlan(plan, {
        timeBlocks: plan.timeBlocks.filter(({ id }) => id !== blockId),
      }),
      rootItems,
    );
    return this.loadPlanner();
  }

  async duplicateTimeBlock(blockId: string, start: number) {
    const { plan, rootItems } = await this.getMutableContext();
    const block = this.getTimeBlock(plan, blockId);
    const duplicate = duplicateDomainTimeBlock(block, this.createId(), start);
    await this.persistScheduledPlan(
      updateDayPlan(plan, { timeBlocks: [...plan.timeBlocks, duplicate] }),
      rootItems,
    );
    return this.loadPlanner();
  }

  async mergeTimeBlocks(firstBlockId: string, secondBlockId: string) {
    const { plan, rootItems } = await this.getMutableContext();
    const first = this.getTimeBlock(plan, firstBlockId);
    const second = this.getTimeBlock(plan, secondBlockId);
    const merged = mergeDomainTimeBlocks(first, second);
    await this.persistScheduledPlan(
      updateDayPlan(plan, {
        timeBlocks: plan.timeBlocks
          .filter(({ id }) => id !== first.id && id !== second.id)
          .concat(merged),
      }),
      rootItems,
    );
    return this.loadPlanner();
  }

  async splitTimeBlock(blockId: string, splitAt: number) {
    const { plan, rootItems } = await this.getMutableContext();
    const block = this.getTimeBlock(plan, blockId);
    const split = splitDomainTimeBlock(block, splitAt, this.createId());
    await this.persistScheduledPlan(
      updateDayPlan(plan, {
        timeBlocks: plan.timeBlocks
          .filter(({ id }) => id !== blockId)
          .concat(split),
      }),
      rootItems,
    );
    return this.loadPlanner();
  }

  async linkTaskToTimeBlock(blockId: string, taskId: string) {
    const { plan, projects, rootItems, tasks } = await this.getMutableContext();
    this.resolveTasks([taskId], tasks, projects);
    const block = this.getTimeBlock(plan, blockId);
    await this.persistScheduledPlan(
      updateDayPlan(plan, {
        taskIds: [...plan.taskIds, taskId],
        timeBlocks: plan.timeBlocks.map((candidate) => candidate.id === blockId
          ? updateDomainTimeBlock(block, {
              linkedTasks: [...block.linkedTasks, taskId],
            })
          : candidate),
      }),
      rootItems,
    );
    return this.loadPlanner();
  }

  async unlinkTaskFromTimeBlock(blockId: string, taskId: string) {
    const { plan, rootItems } = await this.getMutableContext();
    const block = this.getTimeBlock(plan, blockId);
    await this.persistScheduledPlan(
      this.replaceBlock(plan, updateDomainTimeBlock(block, {
        linkedTasks: block.linkedTasks.filter((id) => id !== taskId),
      })),
      rootItems,
    );
    return this.loadPlanner();
  }

  async linkProjectToTimeBlock(blockId: string, projectId: string) {
    const { plan, projects } = await this.getMutableContext();
    this.resolveProjects([projectId], projects);
    const block = this.getTimeBlock(plan, blockId);
    await this.saveBlock(plan, updateDomainTimeBlock(block, {
      linkedProjects: [...block.linkedProjects, projectId],
    }));
    return this.loadPlanner();
  }

  async unlinkProjectFromTimeBlock(blockId: string, projectId: string) {
    const { plan } = await this.getMutableContext();
    const block = this.getTimeBlock(plan, blockId);
    await this.saveBlock(plan, updateDomainTimeBlock(block, {
      linkedProjects: block.linkedProjects.filter((id) => id !== projectId),
    }));
    return this.loadPlanner();
  }

  async unscheduleTask(taskId: string) {
    const { plan, rootItems } = await this.getMutableContext();
    await this.persistScheduledPlan(
      updateDayPlan(plan, {
        timeBlocks: plan.timeBlocks.map((block) =>
          updateDomainTimeBlock(block, {
            linkedTasks: block.linkedTasks.filter((id) => id !== taskId),
          }),
        ),
      }),
      rootItems,
    );
    return this.loadPlanner();
  }

  private createLegacyPlan(date: CalendarDate, tasks: readonly Task[]): DayPlan {
    return createDayPlan({
      createdAt: this.context.now ?? new Date(),
      date,
      id: `day-plan-${date}`,
      taskIds: tasks.filter(({ status }) => status === Status.Today).map(({ id }) => id),
      timeZone: this.context.timeZone,
    });
  }

  private async getMutableContext() {
    const date = getCalendarDate(this.context);
    const rootItems = await this.items.get();
    const allItems = flattenItems(rootItems);
    const tasks = allItems.filter(isTask);
    const projects = allItems.filter(isProject);
    const plan = (await this.plans.get(date)) ?? this.createLegacyPlan(date, tasks);
    return { plan, projects, rootItems, tasks };
  }

  private async persistScheduledPlan(
    plan: DayPlan,
    rootItems: readonly Item[],
  ) {
    await this.plans.save(plan);
    const primaryBlocks = new Map<string, DayPlan["timeBlocks"][number]>();
    for (const block of plan.timeBlocks) {
      for (const taskId of block.linkedTasks) {
        const current = primaryBlocks.get(taskId);
        if (!current || block.start < current.start) primaryBlocks.set(taskId, block);
      }
    }
    const now = new Date();
    let changed = false;

    const synchronize = (item: Item): Item => {
      const children = item.children.map(synchronize);
      const childrenChanged = children.some(
        (child, index) => child !== item.children[index],
      );
      if (!isTask(item)) {
        return childrenChanged
          ? { ...item, children }
          : item;
      }
      const block = primaryBlocks.get(item.id);
      if (block) {
        const start = toZonedInstant(plan.date, block.start, plan.timeZone);
        const end = toZonedInstant(plan.date, block.end, plan.timeZone);
        const alreadyCurrent =
          item.scheduledDate === plan.date &&
          item.scheduledStart?.getTime() === start.getTime() &&
          item.scheduledEnd?.getTime() === end.getTime();
        if (alreadyCurrent) return childrenChanged ? { ...item, children } : item;
        changed = true;
        return { ...setTaskSchedule(item, start, end, plan.date, now), children };
      }
      const belongsToPlan = item.scheduledStart
        ? getCalendarDate({ ...this.context, now: item.scheduledStart }) === plan.date
        : item.scheduledDate === plan.date;
      if (!belongsToPlan) return childrenChanged ? { ...item, children } : item;
      changed = true;
      return { ...clearTaskSchedule(item, now), children };
    };

    const synchronized = rootItems.map(synchronize);
    if (changed) await this.items.save(synchronized);
  }

  private getTimeBlock(plan: DayPlan, blockId: string) {
    const block = plan.timeBlocks.find(({ id }) => id === blockId);
    if (!block) throw new Error("The Time Block no longer exists.");
    return block;
  }

  private async saveBlock(plan: DayPlan, updated: DayPlan["timeBlocks"][number]) {
    await this.plans.save(this.replaceBlock(plan, updated));
  }

  private replaceBlock(
    plan: DayPlan,
    updated: DayPlan["timeBlocks"][number],
  ): DayPlan {
    return updateDayPlan(plan, {
      timeBlocks: plan.timeBlocks.map((candidate) =>
        candidate.id === updated.id ? updated : candidate,
      ),
    });
  }

  private resolveTasks(
    ids: readonly string[],
    tasks: readonly Task[],
    projects: readonly Project[],
  ): readonly Task[] {
    return [...new Set(ids)].map((id) => {
      const task = tasks.find((candidate) => candidate.id === id);
      if (!task || !isPoolTask(task, projects)) {
        throw new Error("A Time Block can only link available Tasks.");
      }
      return task;
    });
  }

  private resolveProjects(
    ids: readonly string[],
    projects: readonly Project[],
  ): readonly Project[] {
    return [...new Set(ids)].map((id) => {
      const project = projects.find((candidate) =>
        candidate.id === id && candidate.status === Status.Active,
      );
      if (!project) throw new Error("A Time Block can only link active Projects.");
      return project;
    });
  }

  private toPlannerProject(project: Project): PlannerProject {
    return { id: project.id, outcome: project.outcome, title: project.title };
  }

  private toPlannerTask(
    task: Task,
    areas: readonly Area[],
    projects: readonly Project[],
  ): PlannerTask {
    const area = areas.find(({ id }) => id === task.areaId);
    const project = getProjectForItem(task, projects);
    return {
      area: { icon: area?.icon ?? "•", id: task.areaId, title: area?.title ?? task.areaId },
      context: task.context ?? null,
      dueDate: task.dueDate ?? null,
      energyCost: task.energyCost,
      estimatedDuration: task.estimatedDuration ?? task.durationMinutes ?? null,
      id: task.id,
      project: project
        ? { id: project.id, outcome: project.outcome, title: project.title }
        : null,
      preferredContext: task.preferredContext ?? task.context ?? null,
      preferredTime: task.preferredTime ?? null,
      scheduledDate: task.scheduledDate ?? null,
      scheduledEnd: task.scheduledEnd ?? null,
      scheduledStart: task.scheduledStart ?? null,
      status: task.status,
      title: task.title,
    };
  }

}

export { DEFAULT_AVAILABLE_MINUTES, PlannerService };
export type { PlannerContext };
