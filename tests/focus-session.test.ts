import assert from "node:assert/strict";
import test from "node:test";

import { FocusService } from "../src/application/FocusService";
import {
  RuleBasedAttentionEngine,
  Status,
  addFocusChecklistItem,
  createDayPlan,
  createFocusSession,
  createProject,
  createTask,
  focusDailyTask,
  getFocusElapsedSeconds,
  pauseFocusSession,
  resumeFocusSession,
} from "../src/domain";
import { MockDailyReviewRepository } from "../src/repositories/MockDailyReviewRepository";
import { MockDayPlanRepository } from "../src/repositories/MockDayPlanRepository";
import { MockItemRepository } from "../src/repositories/MockItemRepository";

const date = "2026-08-25";
const createdAt = new Date("2026-08-25T07:00:00.000Z");

test("a generic Focus timer accumulates resumable elapsed time", () => {
  const running = resumeFocusSession(
    createFocusSession({ elapsedSeconds: 20 }),
    createdAt,
  );
  const later = new Date("2026-08-25T07:01:05.000Z");

  assert.equal(getFocusElapsedSeconds(running, later), 85);
  const paused = pauseFocusSession(running, later);
  assert.equal(paused.elapsedSeconds, 85);
  assert.equal(paused.startedAt, null);
  assert.equal(getFocusElapsedSeconds(paused, new Date("2026-08-26T07:00:00Z")), 85);
});

test("Focus checklist entries remain session steps rather than Tasks", () => {
  const session = addFocusChecklistItem(createFocusSession(), {
    id: "check-one",
    title: "Open the source data",
  });

  assert.deepEqual(session.checklist, [{
    completed: false,
    id: "check-one",
    title: "Open the source data",
  }]);
  assert.throws(
    () => addFocusChecklistItem(session, { id: "check-one", title: "Duplicate" }),
    /unique/,
  );
});

test("FocusService preserves each Task session across pause, switch, and complete", async () => {
  const project = createProject({
    areaId: "work",
    createdAt,
    energyLevel: 3,
    id: "project",
    initialNextAction: { id: "task-a", title: "Draft the release" },
    outcome: "Atlas is available from every device.",
    title: "Deploy Atlas",
  });
  const taskB = createTask({
    areaId: "work",
    createdAt,
    id: "task-b",
    status: Status.Today,
    title: "Verify the deployment",
  });
  const startedPlan = focusDailyTask(createDayPlan({
    createdAt,
    date,
    id: "day-plan",
    taskIds: ["task-a", "task-b"],
    timeZone: "Europe/Stockholm",
  }), "task-a", createdAt);
  const items = new MockItemRepository([project, taskB]);
  const plans = new MockDayPlanRepository([startedPlan]);
  let now = new Date(createdAt);
  let nextId = 0;
  const service = new FocusService(
    items,
    new MockDailyReviewRepository(),
    new RuleBasedAttentionEngine(),
    plans,
    () => date,
    "Europe/Stockholm",
    () => `check-${++nextId}`,
    () => new Date(now),
  );

  const initial = await service.loadFocusSession();
  assert.equal(initial.plan.currentFocus?.id, "task-a");
  assert.equal(initial.relatedProject?.outcome, "Atlas is available from every device.");

  await service.resumeSession("task-a");
  now = new Date("2026-08-25T07:01:05.000Z");
  await service.pauseSession("task-a");
  await service.updateNotes("task-a", "Resume with the health check.");
  await service.addChecklistItem("task-a", "Inspect Railway logs");

  const switched = await service.switchTask("task-b");
  assert.equal(switched.plan.currentFocus?.id, "task-b");
  assert.equal(switched.session?.startedAt, null);
  const stored = await plans.get(date);
  const firstSession = stored?.commitments.find(({ taskId }) => taskId === "task-a")?.session;
  assert.equal(firstSession?.elapsedSeconds, 65);
  assert.equal(firstSession?.notes, "Resume with the health check.");
  assert.equal(firstSession?.checklist[0]?.title, "Inspect Railway logs");

  await service.completeItem("task-b");
  const afterCompletion = await service.loadFocusSession();
  assert.equal(afterCompletion.plan.currentFocus?.id, "task-a");
  assert.equal((await items.get()).find(({ id }) => id === "task-b")?.status, Status.Completed);
});
