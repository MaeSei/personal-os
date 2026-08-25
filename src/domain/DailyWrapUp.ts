import type { CalendarDate, ItemId } from "./Item";

const MAX_WRAP_UP_NOTES_LENGTH = 2_000;

enum PlanAssessment {
  AsPlanned = "AsPlanned",
  Partly = "Partly",
  Differently = "Differently",
}

enum EstimateAssessment {
  Accurate = "Accurate",
  Mixed = "Mixed",
  Inaccurate = "Inaccurate",
  NotEnoughData = "NotEnoughData",
}

type DailyWrapUpTask = {
  readonly actualDurationSeconds: number | null;
  readonly carriedForward: boolean;
  readonly completed: boolean;
  readonly estimatedDurationMinutes: number | null;
  readonly taskId: ItemId;
  readonly title: string;
};

type DailyWrapUpMetrics = {
  readonly actualFocusSeconds: number;
  readonly calendarEventCount: number;
  readonly completedTaskCount: number;
  readonly incompleteTaskCount: number;
  readonly plannedMinutes: number;
  readonly plannedTaskCount: number;
  readonly plannedTimeBlockCount: number;
};

type DailyWrapUp = {
  readonly createdAt: Date;
  readonly date: CalendarDate;
  readonly estimateAssessment: EstimateAssessment;
  readonly metrics: DailyWrapUpMetrics;
  readonly notes: string | null;
  readonly planAssessment: PlanAssessment;
  readonly tasks: readonly DailyWrapUpTask[];
};

type DailyWrapUpReflection = {
  readonly carryForwardTaskIds: readonly ItemId[];
  readonly estimateAssessment: EstimateAssessment;
  readonly notes?: string | null;
  readonly planAssessment: PlanAssessment;
};

type CreateDailyWrapUpInput = DailyWrapUpReflection & {
  readonly calendarEventCount: number;
  readonly createdAt: Date;
  readonly date: CalendarDate;
  readonly plannedMinutes: number;
  readonly plannedTimeBlockCount: number;
  readonly tasks: readonly Omit<DailyWrapUpTask, "carriedForward">[];
};

type DailyWrapUpMetricInput = Pick<
  CreateDailyWrapUpInput,
  "calendarEventCount" | "plannedMinutes" | "plannedTimeBlockCount"
>;

function assertCalendarDate(value: string): asserts value is CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : null;
  if (
    !match || !date || date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) throw new Error("A Daily Wrap-Up requires a valid YYYY-MM-DD date.");
}

function assertCount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative whole number.`);
  }
}

function calculateDailyWrapUpMetrics(
  tasks: readonly Pick<DailyWrapUpTask, "actualDurationSeconds" | "completed">[],
  input: DailyWrapUpMetricInput,
): DailyWrapUpMetrics {
  assertCount(input.calendarEventCount, "Calendar event count");
  assertCount(input.plannedMinutes, "Planned minutes");
  assertCount(input.plannedTimeBlockCount, "Time Block count");
  tasks.forEach((task) => {
    if (
      task.actualDurationSeconds !== null &&
      (!Number.isInteger(task.actualDurationSeconds) || task.actualDurationSeconds < 0)
    ) throw new Error("Actual duration must be non-negative whole seconds.");
  });
  const completedTaskCount = tasks.filter(({ completed }) => completed).length;
  return {
    actualFocusSeconds: tasks.reduce(
      (total, task) => total + (task.actualDurationSeconds ?? 0),
      0,
    ),
    calendarEventCount: input.calendarEventCount,
    completedTaskCount,
    incompleteTaskCount: tasks.length - completedTaskCount,
    plannedMinutes: input.plannedMinutes,
    plannedTaskCount: tasks.length,
    plannedTimeBlockCount: input.plannedTimeBlockCount,
  };
}

/** Creates an immutable end-of-day evidence snapshot without grading the day. */
function createDailyWrapUp(input: CreateDailyWrapUpInput): DailyWrapUp {
  assertCalendarDate(input.date);
  if (!Object.values(PlanAssessment).includes(input.planAssessment)) {
    throw new Error("Daily Wrap-Up requires a supported plan assessment.");
  }
  if (!Object.values(EstimateAssessment).includes(input.estimateAssessment)) {
    throw new Error("Daily Wrap-Up requires a supported estimate assessment.");
  }
  const createdAt = new Date(input.createdAt);
  if (!Number.isFinite(createdAt.getTime())) {
    throw new Error("Daily Wrap-Up requires a valid creation time.");
  }
  const notes = input.notes?.trim() || null;
  if (notes && notes.length > MAX_WRAP_UP_NOTES_LENGTH) {
    throw new Error(`Daily Wrap-Up notes must be ${MAX_WRAP_UP_NOTES_LENGTH} characters or fewer.`);
  }
  const carryIds = new Set(input.carryForwardTaskIds.map((id) => id.trim()));
  if (carryIds.has("")) throw new Error("Carry-forward Tasks require valid ids.");
  const seen = new Set<string>();
  const tasks = input.tasks.map((task) => {
    const taskId = task.taskId.trim();
    const title = task.title.trim();
    if (!taskId || !title || seen.has(taskId)) {
      throw new Error("Daily Wrap-Up Tasks require unique ids and titles.");
    }
    seen.add(taskId);
    if (
      task.estimatedDurationMinutes !== null &&
      (!Number.isInteger(task.estimatedDurationMinutes) || task.estimatedDurationMinutes <= 0)
    ) throw new Error("A stored Task estimate must be positive whole minutes.");
    if (
      task.actualDurationSeconds !== null &&
      (!Number.isInteger(task.actualDurationSeconds) || task.actualDurationSeconds < 0)
    ) throw new Error("Actual duration must be non-negative whole seconds.");
    if (task.completed && carryIds.has(taskId)) {
      throw new Error("Completed Tasks cannot be carried forward.");
    }
    return {
      ...task,
      actualDurationSeconds: task.actualDurationSeconds === 0
        ? null
        : task.actualDurationSeconds,
      carriedForward: carryIds.has(taskId),
      taskId,
      title,
    };
  });
  if ([...carryIds].some((id) => !seen.has(id))) {
    throw new Error("Only unfinished Tasks from today's plan can be carried forward.");
  }
  return {
    createdAt,
    date: input.date,
    estimateAssessment: input.estimateAssessment,
    metrics: calculateDailyWrapUpMetrics(tasks, input),
    notes,
    planAssessment: input.planAssessment,
    tasks,
  };
}

export {
  EstimateAssessment,
  MAX_WRAP_UP_NOTES_LENGTH,
  PlanAssessment,
  calculateDailyWrapUpMetrics,
  createDailyWrapUp,
};
export type {
  CreateDailyWrapUpInput,
  DailyWrapUp,
  DailyWrapUpMetrics,
  DailyWrapUpReflection,
  DailyWrapUpTask,
};
