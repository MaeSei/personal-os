import assert from "node:assert/strict";
import test from "node:test";

import { WrapUpService } from "../src/application/WrapUpService";
import { MockCalendarProvider } from "../src/calendar";
import {
  DayPlanStatus,
  EstimateAssessment,
  PlanAssessment,
  Status,
  TimeBlockType,
  createDayPlan,
  createFocusSession,
  createTask,
  createTimeBlock,
  updateDayPlan,
} from "../src/domain";
import { MockDailyWrapUpRepository } from "../src/repositories/MockDailyWrapUpRepository";
import { MockDayPlanRepository } from "../src/repositories/MockDayPlanRepository";
import { MockItemRepository } from "../src/repositories/MockItemRepository";

function createFixture() {
  const now = new Date("2026-08-25T16:00:00.000Z");
  const completed = createTask({
    areaId: "work",
    createdAt: now,
    estimatedDuration: 30,
    id: "completed",
    status: Status.Completed,
    title: "Finish report",
  });
  const incomplete = createTask({
    areaId: "home",
    createdAt: now,
    estimatedDuration: 60,
    id: "incomplete",
    status: Status.Active,
    title: "Call electrician",
  });
  let plan = createDayPlan({
    createdAt: now,
    date: "2026-08-25",
    id: "day-plan-2026-08-25",
    status: DayPlanStatus.Started,
    taskIds: [completed.id, incomplete.id],
    timeZone: "Europe/Stockholm",
  });
  plan = updateDayPlan(plan, {
    commitments: plan.commitments.map((commitment) =>
      commitment.taskId === completed.id
        ? {
            ...commitment,
            session: createFocusSession({ elapsedSeconds: 1_800 }),
          }
        : commitment,
    ),
    timeBlocks: [
      createTimeBlock("focus-block", {
        end: 10 * 60,
        linkedProjects: [],
        linkedTasks: [completed.id],
        locked: false,
        notes: null,
        start: 9 * 60,
        title: "Finish report",
        type: TimeBlockType.Focus,
      }, now),
    ],
  }, now);
  const plans = new MockDayPlanRepository([plan]);
  const items = new MockItemRepository([completed, incomplete]);
  const wrapUps = new MockDailyWrapUpRepository();
  const calendar = new MockCalendarProvider({
    connected: true,
    events: [{
      allDay: false,
      busy: true,
      calendarId: "work",
      description: null,
      end: new Date("2026-08-25T13:00:00.000Z"),
      id: "calendar-event",
      location: null,
      start: new Date("2026-08-25T12:00:00.000Z"),
      title: "Team review",
    }],
  });
  const service = new WrapUpService(wrapUps, plans, items, calendar, {
    locale: "en-GB",
    now,
    timeZone: "Europe/Stockholm",
    userName: "Maike",
  });
  return { items, plans, service, wrapUps };
}

test("Daily Wrap-Up assembles completed work, open work, Calendar, and durations", async () => {
  const { service } = createFixture();

  const data = await service.loadWrapUp();

  assert.deepEqual(data.completedTasks.map(({ id }) => id), ["completed"]);
  assert.deepEqual(data.incompleteTasks.map(({ id }) => id), ["incomplete"]);
  assert.equal(data.completedTasks[0]?.estimatedDurationMinutes, 30);
  assert.equal(data.completedTasks[0]?.actualDurationSeconds, 1_800);
  assert.equal(data.incompleteTasks[0]?.actualDurationSeconds, null);
  assert.equal(data.metrics.completedTaskCount, 1);
  assert.equal(data.metrics.incompleteTaskCount, 1);
  assert.equal(data.metrics.plannedMinutes, 60);
  assert.equal(data.metrics.actualFocusSeconds, 1_800);
  assert.equal(data.metrics.calendarEventCount, 1);
  assert.deepEqual(data.timeBlocks[0]?.linkedTaskTitles, ["Finish report"]);
});

test("only explicitly selected unfinished work is carried into tomorrow", async () => {
  const { items, plans, service, wrapUps } = createFixture();

  const data = await service.completeWrapUp({
    carryForwardTaskIds: ["incomplete"],
    estimateAssessment: EstimateAssessment.Mixed,
    notes: "Interruptions changed the afternoon.",
    planAssessment: PlanAssessment.Partly,
  });

  assert.equal(data.review?.notes, "Interruptions changed the afternoon.");
  assert.equal(data.review?.metrics.completedTaskCount, 1);
  assert.equal(
    data.review?.tasks.find(({ taskId }) => taskId === "incomplete")?.carriedForward,
    true,
  );
  const tomorrow = await plans.get("2026-08-26");
  assert.deepEqual(tomorrow?.taskIds, ["incomplete"]);
  assert.deepEqual(tomorrow?.timeBlocks, []);
  assert.equal(tomorrow?.status, DayPlanStatus.Draft);
  const storedTask = (await items.get()).find(({ id }) => id === "incomplete");
  assert.equal(storedTask?.status, Status.Active);
  assert.ok(await wrapUps.get("2026-08-25"));
});

test("Daily Wrap-Up never carries unfinished work without confirmation", async () => {
  const { plans, service } = createFixture();

  await service.completeWrapUp({
    carryForwardTaskIds: [],
    estimateAssessment: EstimateAssessment.NotEnoughData,
    notes: null,
    planAssessment: PlanAssessment.Differently,
  });

  assert.equal(await plans.get("2026-08-26"), null);
});

test("Daily Wrap-Up rejects completed carry-forward work and duplicate reviews", async () => {
  const { service } = createFixture();
  await assert.rejects(
    service.completeWrapUp({
      carryForwardTaskIds: ["completed"],
      estimateAssessment: EstimateAssessment.Accurate,
      planAssessment: PlanAssessment.AsPlanned,
    }),
    /Completed Tasks cannot be carried forward/,
  );
  await service.completeWrapUp({
    carryForwardTaskIds: [],
    estimateAssessment: EstimateAssessment.Accurate,
    planAssessment: PlanAssessment.AsPlanned,
  });
  await assert.rejects(
    service.completeWrapUp({
      carryForwardTaskIds: [],
      estimateAssessment: EstimateAssessment.Accurate,
      planAssessment: PlanAssessment.AsPlanned,
    }),
    /already has a Daily Wrap-Up/,
  );
});
