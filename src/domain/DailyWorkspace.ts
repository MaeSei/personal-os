import {
  DayPlanStatus,
  updateDayPlan,
  updateTimeBlock,
  type DayPlan,
  type DayPlanCommitment,
} from "./Planning";
import type { ItemId } from "./Item";
import { createFocusSession, type FocusSession } from "./FocusSession";

type PlaceDailyTaskInput = {
  readonly beforeTaskId?: ItemId | null;
  readonly group?: string | null;
  readonly pinned?: boolean;
  readonly taskId: ItemId;
};

function getCommitment(plan: DayPlan, taskId: ItemId): DayPlanCommitment {
  const commitment = plan.commitments.find((entry) => entry.taskId === taskId);
  if (!commitment) throw new Error("The Task is not in today's Workspace.");
  return commitment;
}

/** Adds or moves one Task while keeping daily metadata attached to it. */
function placeDailyTask(plan: DayPlan, input: PlaceDailyTaskInput): DayPlan {
  const taskId = input.taskId.trim();
  if (!taskId) throw new Error("A Daily Workspace requires a valid Task id.");
  const existing = plan.commitments.find((entry) => entry.taskId === taskId);
  const taskIds = plan.taskIds.filter((id) => id !== taskId);
  const beforeIndex = input.beforeTaskId
    ? taskIds.indexOf(input.beforeTaskId)
    : -1;
  taskIds.splice(beforeIndex >= 0 ? beforeIndex : taskIds.length, 0, taskId);
  const commitment: DayPlanCommitment = {
    focused: existing?.focused ?? false,
    group: input.group === undefined ? existing?.group ?? null : input.group,
    pinned: input.pinned ?? existing?.pinned ?? false,
    session: existing?.session ?? createFocusSession(),
    taskId,
  };
  return updateDayPlan(plan, {
    commitments: plan.commitments
      .filter((entry) => entry.taskId !== taskId)
      .concat(commitment),
    taskIds,
  });
}

function setDailyTaskPinned(
  plan: DayPlan,
  taskId: ItemId,
  pinned: boolean,
): DayPlan {
  getCommitment(plan, taskId);
  return updateDayPlan(plan, {
    commitments: plan.commitments.map((entry) =>
      entry.taskId === taskId ? { ...entry, pinned } : entry,
    ),
  });
}

function setDailyTaskGroup(
  plan: DayPlan,
  taskId: ItemId,
  group: string | null,
): DayPlan {
  getCommitment(plan, taskId);
  return updateDayPlan(plan, {
    commitments: plan.commitments.map((entry) =>
      entry.taskId === taskId ? { ...entry, group } : entry,
    ),
  });
}

/** Selecting focus is explicit enough to publish the draft as today's plan. */
function focusDailyTask(
  plan: DayPlan,
  taskId: ItemId,
  now: Date = new Date(),
): DayPlan {
  getCommitment(plan, taskId);
  return updateDayPlan(plan, {
    commitments: plan.commitments.map((entry) => ({
      ...entry,
      focused: entry.taskId === taskId,
    })),
    status: DayPlanStatus.Started,
  }, now);
}

function updateDailyTaskSession(
  plan: DayPlan,
  taskId: ItemId,
  update: (session: FocusSession) => FocusSession,
): DayPlan {
  getCommitment(plan, taskId);
  return updateDayPlan(plan, {
    commitments: plan.commitments.map((entry) =>
      entry.taskId === taskId
        ? { ...entry, session: update(entry.session) }
        : entry,
    ),
  });
}

/** Removes daily intent and any schedule link without deleting the Task. */
function removeDailyTask(plan: DayPlan, taskId: ItemId): DayPlan {
  getCommitment(plan, taskId);
  return updateDayPlan(plan, {
    commitments: plan.commitments.filter((entry) => entry.taskId !== taskId),
    taskIds: plan.taskIds.filter((id) => id !== taskId),
    timeBlocks: plan.timeBlocks.map((block) =>
      updateTimeBlock(block, {
        linkedTasks: block.linkedTasks.filter((id) => id !== taskId),
      }),
    ),
  });
}

export {
  focusDailyTask,
  placeDailyTask,
  removeDailyTask,
  setDailyTaskGroup,
  setDailyTaskPinned,
  updateDailyTaskSession,
};
export type { PlaceDailyTaskInput };
