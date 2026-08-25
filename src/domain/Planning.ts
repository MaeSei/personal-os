import type { ActionableItem } from "./Focus";
import type { CalendarDate, Item, ItemId } from "./Item";
import { Status } from "./Status";
import { isTask } from "./Task";
import { createFocusSession, type FocusSession } from "./FocusSession";

const MINUTES_PER_DAY = 24 * 60;

enum TimeBlockType {
  Focus = "Focus",
  Meeting = "Meeting",
  Break = "Break",
  Travel = "Travel",
  Admin = "Admin",
  Personal = "Personal",
  Flexible = "Flexible",
}

const timeBlockTypes = Object.values(TimeBlockType);

enum DayPlanStatus {
  Draft = "Draft",
  Started = "Started",
}

type TimeBlockId = string;

type TimeBlock = {
  readonly createdAt: Date;
  readonly end: number;
  readonly id: TimeBlockId;
  readonly linkedProjects: readonly ItemId[];
  readonly linkedTasks: readonly ItemId[];
  readonly locked: boolean;
  readonly notes: string | null;
  readonly start: number;
  readonly title: string;
  readonly type: TimeBlockType;
  readonly updatedAt: Date;
};

type DayPlan = {
  readonly commitments: readonly DayPlanCommitment[];
  readonly createdAt: Date;
  readonly date: CalendarDate;
  readonly id: string;
  readonly status: DayPlanStatus;
  readonly taskIds: readonly ItemId[];
  readonly timeBlocks: readonly TimeBlock[];
  readonly timeZone: string;
  readonly updatedAt: Date;
};

type DayPlanCommitment = {
  readonly focused: boolean;
  readonly group: string | null;
  readonly pinned: boolean;
  readonly session: FocusSession;
  readonly taskId: ItemId;
};

type TimeBlockValues = Pick<
  TimeBlock,
  | "end"
  | "linkedProjects"
  | "linkedTasks"
  | "locked"
  | "notes"
  | "start"
  | "title"
  | "type"
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
  ) throw new Error("A Day Plan requires a valid YYYY-MM-DD date.");
}

function normalizeIds(values: readonly ItemId[]): readonly ItemId[] {
  const ids = values.map((value) => value.trim());
  if (ids.some((value) => !value)) {
    throw new Error("Time Block links require valid Item ids.");
  }
  return [...new Set(ids)];
}

function normalizeCommitmentGroup(value: string | null | undefined): string | null {
  const group = value?.trim() || null;
  if (group && group.length > 60) {
    throw new Error("A Daily Workspace group must be 60 characters or fewer.");
  }
  return group;
}

function normalizeCommitments(
  taskIds: readonly ItemId[],
  values: readonly DayPlanCommitment[],
): readonly DayPlanCommitment[] {
  const byTaskId = new Map(values.map((value) => [value.taskId, value]));
  const commitments = taskIds.map((taskId) => {
    const value = byTaskId.get(taskId);
    return {
      focused: value?.focused ?? false,
      group: normalizeCommitmentGroup(value?.group),
      pinned: value?.pinned ?? false,
      session: createFocusSession(value?.session),
      taskId,
    };
  });
  if (commitments.filter(({ focused }) => focused).length > 1) {
    throw new Error("A Daily Workspace can have only one focused Task.");
  }
  return commitments;
}

function normalizeBlock(values: TimeBlockValues): TimeBlockValues {
  const title = values.title.trim();
  if (!title) throw new Error("A Time Block requires a title.");
  if (!Number.isInteger(values.start) || values.start < 0) {
    throw new Error("A Time Block requires a valid start time.");
  }
  if (!Number.isInteger(values.end) || values.end <= values.start) {
    throw new Error("A Time Block must end after it starts.");
  }
  if (values.end > MINUTES_PER_DAY) {
    throw new Error("A Time Block must end on the same calendar day.");
  }
  if (!timeBlockTypes.includes(values.type)) {
    throw new Error("A Time Block requires a supported type.");
  }
  return {
    ...values,
    linkedProjects: normalizeIds(values.linkedProjects),
    linkedTasks: normalizeIds(values.linkedTasks),
    notes: values.notes?.trim() || null,
    title,
  };
}

function assertTimeBlocksDoNotOverlap(blocks: readonly TimeBlock[]) {
  const ordered = [...blocks].sort((left, right) => left.start - right.start);
  if (ordered.some((block, index) => index > 0 && block.start < ordered[index - 1].end)) {
    throw new Error("Time Blocks cannot overlap.");
  }
}

function createDayPlan(input: {
  readonly commitments?: readonly DayPlanCommitment[];
  readonly createdAt: Date;
  readonly date: string;
  readonly id: string;
  readonly status?: DayPlanStatus;
  readonly taskIds?: readonly ItemId[];
  readonly timeZone: string;
}): DayPlan {
  assertCalendarDate(input.date);
  const id = input.id.trim();
  const timeZone = input.timeZone.trim();
  if (!id || !timeZone) throw new Error("A Day Plan requires an id and time zone.");
  const createdAt = new Date(input.createdAt.getTime());
  const taskIds = [...new Set(
    input.taskIds ?? input.commitments?.map(({ taskId }) => taskId) ?? [],
  )];
  return {
    commitments: normalizeCommitments(taskIds, input.commitments ?? []),
    createdAt,
    date: input.date,
    id,
    status: input.status ?? DayPlanStatus.Draft,
    taskIds,
    timeBlocks: [],
    timeZone,
    updatedAt: new Date(createdAt.getTime()),
  };
}

function createTimeBlock(
  id: TimeBlockId,
  values: TimeBlockValues,
  now: Date = new Date(),
): TimeBlock {
  const normalizedId = id.trim();
  if (!normalizedId) throw new Error("A Time Block requires an id.");
  const normalized = normalizeBlock(values);
  return {
    ...normalized,
    createdAt: new Date(now.getTime()),
    id: normalizedId,
    updatedAt: new Date(now.getTime()),
  };
}

function updateTimeBlock(
  block: TimeBlock,
  changes: Partial<TimeBlockValues>,
  now: Date = new Date(),
): TimeBlock {
  const temporalChange =
    (changes.start !== undefined && changes.start !== block.start) ||
    (changes.end !== undefined && changes.end !== block.end);
  if (block.locked && temporalChange) {
    throw new Error("Unlock the Time Block before moving or resizing it.");
  }
  return {
    ...block,
    ...normalizeBlock({ ...block, ...changes }),
    updatedAt: new Date(now.getTime()),
  };
}

function duplicateTimeBlock(
  block: TimeBlock,
  id: TimeBlockId,
  start: number,
  now: Date = new Date(),
): TimeBlock {
  const duration = block.end - block.start;
  return createTimeBlock(id, {
    ...block,
    end: start + duration,
    locked: false,
    start,
  }, now);
}

function mergeTimeBlocks(
  first: TimeBlock,
  second: TimeBlock,
  now: Date = new Date(),
): TimeBlock {
  const [earlier, later] = first.start <= second.start ? [first, second] : [second, first];
  if (earlier.locked || later.locked) {
    throw new Error("Unlock both Time Blocks before merging them.");
  }
  if (earlier.end !== later.start) {
    throw new Error("Only adjacent Time Blocks can be merged.");
  }
  if (earlier.type !== later.type) {
    throw new Error("Only Time Blocks of the same type can be merged.");
  }
  return updateTimeBlock(earlier, {
    end: later.end,
    linkedProjects: [...earlier.linkedProjects, ...later.linkedProjects],
    linkedTasks: [...earlier.linkedTasks, ...later.linkedTasks],
    notes: [earlier.notes, later.notes].filter(Boolean).join("\n") || null,
    title: earlier.title === later.title
      ? earlier.title
      : `${earlier.title} + ${later.title}`,
  }, now);
}

function splitTimeBlock(
  block: TimeBlock,
  splitAt: number,
  secondId: TimeBlockId,
  now: Date = new Date(),
): readonly [TimeBlock, TimeBlock] {
  if (block.locked) throw new Error("Unlock the Time Block before splitting it.");
  if (!Number.isInteger(splitAt) || splitAt <= block.start || splitAt >= block.end) {
    throw new Error("A split must fall inside the Time Block.");
  }
  return [
    updateTimeBlock(block, { end: splitAt }, now),
    createTimeBlock(secondId, { ...block, start: splitAt }, now),
  ];
}

function updateDayPlan(
  plan: DayPlan,
  changes: Partial<
    Pick<DayPlan, "commitments" | "status" | "taskIds" | "timeBlocks">
  >,
  now: Date = new Date(),
): DayPlan {
  const timeBlocks = [...(changes.timeBlocks ?? plan.timeBlocks)]
    .sort((left, right) => left.start - right.start || left.id.localeCompare(right.id));
  assertTimeBlocksDoNotOverlap(timeBlocks);
  const taskIds = [...new Set(
    changes.taskIds ?? changes.commitments?.map(({ taskId }) => taskId) ?? plan.taskIds,
  )];
  return {
    ...plan,
    commitments: normalizeCommitments(
      taskIds,
      changes.commitments ?? plan.commitments,
    ),
    status: changes.status ?? plan.status,
    taskIds,
    timeBlocks,
    updatedAt: new Date(now.getTime()),
  };
}

/** Projects an accepted plan into executable Tasks without changing Item state. */
function getPlannedTasks(
  plan: Pick<DayPlan, "commitments" | "taskIds">,
  items: readonly Item[],
): readonly ActionableItem[] {
  const tasks = new Map<string, ActionableItem>();
  function visit(item: Item) {
    if (isTask(item) && [Status.Active, Status.Today].includes(item.status)) {
      tasks.set(item.id, { ...item, status: Status.Today });
    }
    item.children.forEach(visit);
  }
  items.forEach(visit);
  const focusedTaskId = plan.commitments.find(({ focused }) => focused)?.taskId;
  const taskIds = focusedTaskId
    ? [focusedTaskId, ...plan.taskIds.filter((taskId) => taskId !== focusedTaskId)]
    : plan.taskIds;
  return taskIds.flatMap((taskId) => {
    const task = tasks.get(taskId);
    return task ? [task] : [];
  });
}

export {
  DayPlanStatus,
  MINUTES_PER_DAY,
  TimeBlockType,
  assertTimeBlocksDoNotOverlap,
  createDayPlan,
  createTimeBlock,
  duplicateTimeBlock,
  getPlannedTasks,
  mergeTimeBlocks,
  splitTimeBlock,
  timeBlockTypes,
  updateDayPlan,
  updateTimeBlock,
};
export type {
  DayPlan,
  DayPlanCommitment,
  TimeBlock,
  TimeBlockId,
  TimeBlockValues,
};
