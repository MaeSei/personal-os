import type { AreaId } from "./Area";
import type { AttentionScore, Effort, EnergyCost } from "./Attention";
import {
  ItemType,
  type CalendarDate,
  type Item,
  type ItemId,
} from "./Item";
import { Status } from "./Status";
import { normalizeContexts } from "./ContextEngine";
import {
  isEstimateConfidence,
  type EstimateConfidence,
} from "./EffortModel";

enum PreferredTime {
  Anytime = "Anytime",
  Morning = "Morning",
  Afternoon = "Afternoon",
  Evening = "Evening",
}

const preferredTimes = Object.values(PreferredTime);

type Task = Item & {
  readonly areaId: AreaId;
  readonly context?: string | null;
  readonly contexts: readonly string[];
  readonly dueDate?: CalendarDate | null;
  readonly durationMinutes?: number | null;
  readonly estimateConfidence: EstimateConfidence | null;
  readonly estimatedDuration: number | null;
  readonly preferredContext: string | null;
  readonly preferredTime: PreferredTime | null;
  readonly projectId: ItemId | null;
  readonly scheduledDate?: CalendarDate | null;
  readonly scheduledEnd: Date | null;
  readonly scheduledStart: Date | null;
  readonly status: TaskStatus;
  readonly type: ItemType.Task;
};

type TaskStatus =
  | Status.Active
  | Status.Today
  | Status.Waiting
  | Status.Blocked
  | Status.Someday
  | Status.Completed
  | Status.Archived;

type CreateTaskInput = {
  readonly areaId: AreaId;
  readonly attentionScore?: AttentionScore;
  readonly context?: string | null;
  readonly contexts?: readonly string[];
  readonly createdAt: Date;
  readonly description?: string | null;
  readonly dueDate?: CalendarDate | null;
  readonly durationMinutes?: number | null;
  readonly estimateConfidence?: EstimateConfidence | null;
  readonly estimatedDuration?: number | null;
  readonly effort?: Effort;
  readonly energyCost?: EnergyCost;
  readonly id: ItemId;
  readonly preferredContext?: string | null;
  readonly preferredTime?: PreferredTime | null;
  readonly projectId?: ItemId | null;
  readonly scheduledDate?: CalendarDate | null;
  readonly scheduledEnd?: Date | null;
  readonly scheduledStart?: Date | null;
  readonly status?: TaskStatus;
  readonly tags?: readonly string[];
  readonly title: string;
};

type UpdateTaskInput = Omit<CreateTaskInput, "createdAt" | "id">;

const taskStatuses: readonly TaskStatus[] = [
  Status.Active,
  Status.Today,
  Status.Waiting,
  Status.Blocked,
  Status.Someday,
  Status.Completed,
  Status.Archived,
];

function isTaskStatus(status: Status): status is TaskStatus {
  return taskStatuses.includes(status as TaskStatus);
}

function isWorkLevel(value: number): value is EnergyCost | Effort {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function normalizeCalendarDate(
  value: CalendarDate | null | undefined,
  label: string,
) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);

  if (!match) {
    throw new Error(`A Task ${label} must use YYYY-MM-DD.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`A Task ${label} must be a valid calendar day.`);
  }

  return normalized;
}

function normalizeDuration(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("A Task duration must be a positive number of minutes.");
  }

  return value;
}

function normalizeSchedule(
  start: Date | null | undefined,
  end: Date | null | undefined,
): readonly [Date | null, Date | null] {
  if (start === null || start === undefined) {
    if (end !== null && end !== undefined) {
      throw new Error("A Task schedule requires both start and end.");
    }
    return [null, null];
  }
  if (end === null || end === undefined) {
    throw new Error("A Task schedule requires both start and end.");
  }
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    throw new Error("A Task schedule requires valid dates.");
  }
  if (end.getTime() <= start.getTime()) {
    throw new Error("A Task schedule must end after it starts.");
  }
  return [new Date(start.getTime()), new Date(end.getTime())];
}

function clampAttentionScore(value: number): AttentionScore {
  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.min(Math.max(value, 0), 100);
}

/** Creates work that always has an Area and may optionally have a Project. */
function createTask(input: CreateTaskInput): Task {
  const areaId = input.areaId.trim();
  const id = input.id.trim();
  const projectId = input.projectId?.trim() || null;
  const title = input.title.trim();

  if (!areaId || !id || !title) {
    throw new Error("A Task requires an id, title, and Area.");
  }

  if (id === projectId) {
    throw new Error("A Task cannot belong to itself as a Project.");
  }

  const energyCost = input.energyCost ?? 3;
  const effort = input.effort ?? energyCost;
  const status = input.status ?? Status.Today;
  const estimatedDuration = normalizeDuration(
    input.estimatedDuration ?? input.durationMinutes,
  );
  const estimateConfidence = input.estimateConfidence ?? null;
  const contexts = normalizeContexts(
    input.contexts === undefined
      ? [input.preferredContext, input.context]
      : input.contexts,
  );
  const preferredContext = contexts[0] ?? null;
  const preferredTime = input.preferredTime ?? null;
  const [scheduledStart, scheduledEnd] = normalizeSchedule(
    input.scheduledStart,
    input.scheduledEnd,
  );

  if (!isWorkLevel(energyCost) || !isWorkLevel(effort)) {
    throw new Error("Task energy and effort must be between 1 and 5.");
  }
  if (
    estimateConfidence !== null &&
    !isEstimateConfidence(estimateConfidence)
  ) {
    throw new Error("A Task requires a supported estimate confidence.");
  }

  if (!isTaskStatus(status)) {
    throw new Error("A Task requires a supported status.");
  }
  if (preferredTime !== null && !preferredTimes.includes(preferredTime)) {
    throw new Error("A Task requires a supported preferred time.");
  }

  const createdAt = new Date(input.createdAt.getTime());

  return {
    areaId,
    attentionScore: clampAttentionScore(input.attentionScore ?? 50),
    children: [],
    context: preferredContext,
    contexts,
    createdAt,
    description: input.description?.trim() || null,
    dueDate: normalizeCalendarDate(input.dueDate, "due date"),
    durationMinutes: estimatedDuration,
    estimateConfidence,
    estimatedDuration,
    effort,
    energyCost,
    id,
    parentId: projectId,
    preferredContext,
    preferredTime,
    projectId,
    scheduledDate: normalizeCalendarDate(
      input.scheduledDate,
      "scheduled date",
    ),
    scheduledEnd,
    scheduledStart,
    status,
    tags: [...(input.tags ?? [])],
    title,
    type: ItemType.Task,
    updatedAt: new Date(createdAt.getTime()),
  };
}

/** Applies the primary Time Block allocation without changing Task status. */
function setTaskSchedule(
  task: Task,
  scheduledStart: Date,
  scheduledEnd: Date,
  scheduledDate: CalendarDate,
  updatedAt: Date = new Date(),
): Task {
  const [start, end] = normalizeSchedule(scheduledStart, scheduledEnd);
  return {
    ...task,
    scheduledDate: normalizeCalendarDate(scheduledDate, "scheduled date"),
    scheduledEnd: end,
    scheduledStart: start,
    updatedAt: new Date(updatedAt.getTime()),
  };
}

function clearTaskSchedule(task: Task, updatedAt: Date = new Date()): Task {
  return {
    ...task,
    scheduledDate: null,
    scheduledEnd: null,
    scheduledStart: null,
    updatedAt: new Date(updatedAt.getTime()),
  };
}

/** Runtime refinement that enforces the Task Area and Project shape. */
function isTask(item: Item): item is Task {
  return (
    item.type === ItemType.Task &&
    isTaskStatus(item.status) &&
    item.areaId !== null &&
    item.areaId.trim().length > 0 &&
    (item.projectId === null ||
      (typeof item.projectId === "string" && item.projectId.trim().length > 0))
  );
}

/** Revises a Task while preserving identity, capture time, and legacy children. */
function updateTask(
  task: Task,
  input: UpdateTaskInput,
  updatedAt: Date = new Date(),
): Task {
  const revised = createTask({
    ...input,
    createdAt: task.createdAt,
    id: task.id,
  });

  return {
    ...revised,
    children: task.children,
    parentId:
      task.projectId === revised.projectId ? task.parentId : revised.projectId,
    updatedAt: new Date(updatedAt.getTime()),
  };
}

export {
  PreferredTime,
  clearTaskSchedule,
  createTask,
  isTask,
  isTaskStatus,
  preferredTimes,
  setTaskSchedule,
  taskStatuses,
  updateTask,
};
export type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput };
