import assert from "node:assert/strict";
import test from "node:test";

import {
  DayPlanStatus,
  TimeBlockType,
  createDayPlan,
  createTask,
  createTimeBlock,
  focusDailyTask,
  getPlannedTasks,
  placeDailyTask,
  removeDailyTask,
  setDailyTaskGroup,
  setDailyTaskPinned,
} from "../src/domain";

const createdAt = new Date("2026-08-25T06:00:00.000Z");

test("daily commitments retain metadata while their order changes", () => {
  let plan = createDayPlan({
    createdAt,
    date: "2026-08-25",
    id: "day-plan",
    taskIds: ["one", "two"],
    timeZone: "Europe/Stockholm",
  });
  plan = setDailyTaskGroup(plan, "one", "Deep work");
  plan = setDailyTaskPinned(plan, "one", true);
  plan = placeDailyTask(plan, { beforeTaskId: "one", taskId: "two" });

  assert.deepEqual(plan.taskIds, ["two", "one"]);
  assert.deepEqual(plan.commitments.map(({ focused, group, pinned, taskId }) => ({
    focused,
    group,
    pinned,
    taskId,
  })), [
    { focused: false, group: null, pinned: false, taskId: "two" },
    { focused: false, group: "Deep work", pinned: true, taskId: "one" },
  ]);
  assert.ok(plan.commitments.every(({ session }) => session.elapsedSeconds === 0));
});

test("choosing focus publishes the plan and keeps exactly one current Task", () => {
  let plan = createDayPlan({
    createdAt,
    date: "2026-08-25",
    id: "day-plan",
    taskIds: ["one", "two"],
    timeZone: "Europe/Stockholm",
  });
  plan = focusDailyTask(plan, "one");
  plan = focusDailyTask(plan, "two");

  assert.equal(plan.status, DayPlanStatus.Started);
  assert.deepEqual(
    plan.commitments.filter(({ focused }) => focused).map(({ taskId }) => taskId),
    ["two"],
  );
  const tasks = ["one", "two"].map((id) => createTask({
    areaId: "work",
    createdAt,
    id,
    title: id,
  }));
  assert.deepEqual(getPlannedTasks(plan, tasks).map(({ id }) => id), ["two", "one"]);
});

test("removing a daily Task also unlinks it from today's Time Blocks", () => {
  const block = createTimeBlock("block", {
    end: 600,
    linkedProjects: [],
    linkedTasks: ["one", "two"],
    locked: false,
    notes: null,
    start: 540,
    title: "Focus",
    type: TimeBlockType.Focus,
  }, createdAt);
  const plan = createDayPlan({
    createdAt,
    date: "2026-08-25",
    id: "day-plan",
    taskIds: ["one", "two"],
    timeZone: "Europe/Stockholm",
  });
  const withBlock = { ...plan, timeBlocks: [block] };

  const result = removeDailyTask(withBlock, "one");

  assert.deepEqual(result.taskIds, ["two"]);
  assert.deepEqual(result.timeBlocks[0]?.linkedTasks, ["two"]);
});
