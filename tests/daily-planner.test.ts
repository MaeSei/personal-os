import assert from "node:assert/strict";
import test from "node:test";

import { PlannerService } from "../src/application/PlannerService";
import {
  MockCalendarProvider,
  type CalendarProvider,
} from "../src/calendar";
import {
  AvailabilityService,
  DayPlanStatus,
  Status,
  PlanningRulesEngine,
  TimeBlockType,
  createDailyReviewResult,
  createInboxItem,
  createProject,
  createTask,
  initialAreas,
} from "../src/domain";
import type { AreaRepository } from "../src/repositories/AreaRepository";
import { MockDailyReviewRepository } from "../src/repositories/MockDailyReviewRepository";
import { MockDayPlanRepository } from "../src/repositories/MockDayPlanRepository";
import { MockItemRepository } from "../src/repositories/MockItemRepository";

class AreaMemoryRepository implements AreaRepository {
  get() { return Promise.resolve(initialAreas); }
  save() { return Promise.resolve(); }
}

function createPlanner(
  calendar: CalendarProvider = new MockCalendarProvider(),
) {
  const createdAt = new Date("2026-08-24T06:00:00.000Z");
  const projectTask = createTask({
    areaId: "work",
    createdAt,
    durationMinutes: 60,
    energyCost: 4,
    id: "project-task",
    projectId: "project",
    status: Status.Active,
    title: "Advance outcome",
  });
  const project = {
    ...createProject({
      areaId: "work",
      createdAt,
      energyLevel: 3,
      id: "project",
      outcome: "The outcome is ready.",
      title: "Important Project",
    }),
    children: [projectTask],
  };
  const standalone = createTask({
    areaId: "home",
    createdAt,
    durationMinutes: 30,
    id: "standalone",
    status: Status.Active,
    title: "Call electrician",
  });
  const items = new MockItemRepository([
    project,
    standalone,
    createInboxItem({ createdAt, id: "inbox", title: "Remember this" }),
  ]);
  const plans = new MockDayPlanRepository();
  const reviews = new MockDailyReviewRepository(
    createDailyReviewResult({ energy: 4, motivation: 4, stress: 2 }, "2026-08-24"),
  );
  const ids = ["block", "split-block", "second-block", "third-block"];
  const service = new PlannerService(
    plans,
    items,
    new AreaMemoryRepository(),
    reviews,
    new AvailabilityService(),
    new PlanningRulesEngine(),
    calendar,
    () => ids.shift() ?? "unexpected-id",
    {
      locale: "en-GB",
      now: new Date("2026-08-24T08:00:00.000Z"),
      timeZone: "Europe/Stockholm",
      userName: "Maike",
    },
  );
  return { items, plans, service };
}

test("Planner assembles current Review, Inbox, Projects, Tasks, and no fake events", async () => {
  const { items, plans, service } = createPlanner();
  const data = await service.loadPlanner();

  assert.equal(data.morning.date, "2026-08-24");
  assert.equal(data.morning.activeProjectCount, 1);
  assert.equal(data.morning.inboxCount, 1);
  assert.deepEqual(data.inbox.map(({ id }) => id), ["inbox"]);
  assert.equal(data.attention?.energy, 4);
  assert.deepEqual(data.calendar.events, []);
  assert.deepEqual(data.suggestions.map(({ task }) => task.id), [
    "standalone",
    "project-task",
  ]);
  assert.deepEqual(data.suggestions.map(({ placement, task }) => ({
    end: placement.end,
    id: task.id,
    start: placement.start,
  })), [
    { end: 570, id: "standalone", start: 540 },
    { end: 630, id: "project-task", start: 570 },
  ]);
  assert.equal(data.commitments.length, 0);
  assert.equal(data.timeBlocks.length, 0);
  assert.equal(await plans.get("2026-08-24"), null);
  const storedTasks = (await items.get()).flatMap((item) =>
    item.children.length > 0 ? item.children : [item]
  );
  assert.equal(storedTasks.every((item) => item.scheduledStart == null), true);
  assert.equal(data.plan.persisted, false);
  assert.equal(data.plan.status, DayPlanStatus.Draft);
  assert.deepEqual(data.availableSlots, [{ duration: 480, end: 1020, start: 540 }]);
});

test("Morning plans persist as resumable drafts until the user starts the day", async () => {
  const { plans, service } = createPlanner();

  let data = await service.saveDraft();
  assert.equal(data.plan.persisted, true);
  assert.equal(data.plan.status, DayPlanStatus.Draft);
  assert.equal((await plans.get("2026-08-24"))?.status, DayPlanStatus.Draft);

  data = await service.placeTask("standalone");
  assert.equal(data.plan.status, DayPlanStatus.Draft);
  assert.deepEqual(data.commitments.map(({ id }) => id), ["standalone"]);

  data = await service.startDay();
  assert.equal(data.plan.status, DayPlanStatus.Started);
  assert.equal((await plans.get("2026-08-24"))?.status, DayPlanStatus.Started);
});

test("Discarding a Morning draft removes planning data without changing Tasks", async () => {
  const { items, plans, service } = createPlanner();

  let data = await service.createTimeBlock({
    end: 10 * 60,
    linkedTaskIds: ["standalone"],
    start: 9 * 60,
    title: "Call electrician",
    type: TimeBlockType.Focus,
  });
  assert.equal(data.plan.persisted, true);
  assert.equal(data.commitments[0]?.status, Status.Active);
  assert.ok(data.commitments[0]?.scheduledStart);

  data = await service.discardDraft();

  assert.equal(await plans.get("2026-08-24"), null);
  assert.equal(data.plan.persisted, false);
  assert.deepEqual(data.commitments, []);
  assert.deepEqual(data.timeBlocks, []);
  const standalone = (await items.get()).find(({ id }) => id === "standalone");
  assert.equal(standalone?.status, Status.Active);
  assert.equal(standalone?.scheduledDate, null);
  assert.equal(standalone?.scheduledStart, null);
  assert.equal(standalone?.scheduledEnd, null);
});

test("A started day cannot be discarded", async () => {
  const { plans, service } = createPlanner();

  await service.saveDraft();
  await service.startDay();

  await assert.rejects(service.discardDraft(), /started day cannot be discarded/i);
  assert.equal(
    (await plans.get("2026-08-24"))?.status,
    DayPlanStatus.Started,
  );
});

test("Multiple available Tasks can be selected into today with one command", async () => {
  const { service } = createPlanner();

  const data = await service.placeTasks(["project-task", "standalone", "project-task"]);

  assert.deepEqual(data.commitments.map(({ id }) => id), [
    "project-task",
    "standalone",
  ]);
  assert.equal(data.taskPool.length, 0);
});

test("Planner reads external events only through its CalendarProvider", async () => {
  const calendar = new MockCalendarProvider({
    connected: true,
    events: [{
      allDay: false,
      busy: true,
      calendarId: "work",
      description: null,
      end: new Date("2026-08-24T09:00:00.000Z"),
      id: "meeting",
      location: "Studio",
      start: new Date("2026-08-24T08:00:00.000Z"),
      title: "Design review",
    }],
  });
  const { service } = createPlanner(calendar);

  const data = await service.loadPlanner();

  assert.equal(data.calendar.connected, true);
  assert.equal(data.calendar.timeZone, "Europe/Stockholm");
  assert.deepEqual(data.calendar.events.map(({ id }) => id), ["meeting"]);
  assert.deepEqual(data.availableSlots, [
    { duration: 60, end: 600, start: 540 },
    { duration: 360, end: 1020, start: 660 },
  ]);
  assert.equal(data.availableTime.totalMinutes, 420);
  assert.equal(data.availableTime.remainingMinutes, 420);
});

test("Calendar Workspace keeps events, reservations, and open slots coherent", async () => {
  const calendar = new MockCalendarProvider({
    connected: true,
    events: [{
      allDay: false,
      busy: true,
      calendarId: "work",
      description: null,
      end: new Date("2026-08-24T12:00:00.000Z"),
      id: "lunch-meeting",
      location: null,
      start: new Date("2026-08-24T11:00:00.000Z"),
      title: "Lunch meeting",
    }],
  });
  const { service } = createPlanner(calendar);

  let data = await service.createTimeBlock({
    end: 9 * 60 + 30,
    linkedTaskIds: ["standalone"],
    start: 9 * 60,
    title: "Call electrician",
    type: TimeBlockType.Focus,
  });
  const blockId = data.timeBlocks[0]?.id;
  assert.ok(blockId);
  assert.deepEqual(data.calendar.events.map(({ id }) => id), ["lunch-meeting"]);
  assert.deepEqual(data.availableSlots, [
    { duration: 210, end: 780, start: 570 },
    { duration: 180, end: 1020, start: 840 },
  ]);

  data = await service.moveTimeBlock(blockId, 10 * 60);
  assert.deepEqual(data.availableSlots, [
    { duration: 60, end: 600, start: 540 },
    { duration: 150, end: 780, start: 630 },
    { duration: 180, end: 1020, start: 840 },
  ]);

  data = await service.resizeTimeBlock(blockId, 11 * 60);
  assert.deepEqual(data.availableSlots, [
    { duration: 60, end: 600, start: 540 },
    { duration: 120, end: 780, start: 660 },
    { duration: 180, end: 1020, start: 840 },
  ]);

  data = await service.unscheduleTask("standalone");
  assert.equal(data.timeBlocks[0]?.linkedTasks.length, 0);
  assert.equal(data.commitments[0]?.scheduledStart, null);

  data = await service.deleteTimeBlock(blockId);
  assert.deepEqual(data.availableSlots, [
    { duration: 240, end: 780, start: 540 },
    { duration: 180, end: 1020, start: 840 },
  ]);
});

test("drag scheduling creates persisted work without changing Task status", async () => {
  const { items, plans, service } = createPlanner();

  let data = await service.scheduleTaskInSlot("project-task", 9 * 60);
  const blockId = data.timeBlocks[0]?.id;
  assert.ok(blockId);
  assert.equal(data.timeBlocks[0]?.start, 9 * 60);
  assert.equal(data.timeBlocks[0]?.end, 10 * 60);
  assert.deepEqual(data.timeBlocks[0]?.linkedTasks.map(({ id }) => id), ["project-task"]);
  assert.deepEqual(data.timeBlocks[0]?.linkedProjects.map(({ id }) => id), ["project"]);
  assert.deepEqual(data.commitments.map(({ id }) => id), ["project-task"]);
  assert.equal(data.commitments[0]?.status, Status.Active);
  assert.equal(data.commitments[0]?.scheduledStart?.toISOString(), "2026-08-24T07:00:00.000Z");
  assert.equal(data.commitments[0]?.scheduledEnd?.toISOString(), "2026-08-24T08:00:00.000Z");
  assert.equal((await plans.get("2026-08-24"))?.timeBlocks.length, 1);

  data = await service.moveTimeBlock(blockId, 10 * 60);
  data = await service.resizeTimeBlock(blockId, 11 * 60);
  data = await service.duplicateTimeBlock(blockId, 12 * 60);
  assert.equal(data.timeBlocks.length, 2);
  assert.equal(data.commitments[0]?.status, Status.Active);

  data = await service.deleteTimeBlock(blockId);
  assert.equal(data.timeBlocks.length, 1);
  assert.equal(data.commitments[0]?.scheduledStart?.toISOString(), "2026-08-24T10:00:00.000Z");

  data = await service.unscheduleTask("project-task");
  assert.equal(data.timeBlocks[0]?.linkedTasks.length, 0);
  assert.equal(data.commitments[0]?.scheduledStart, null);
  const storedProject = (await items.get()).find(({ id }) => id === "project");
  assert.equal(storedProject?.children[0]?.status, Status.Active);
});

test("slot scheduling revalidates fit against Calendar and existing blocks", async () => {
  const calendar = new MockCalendarProvider({
    connected: true,
    events: [{
      allDay: false,
      busy: true,
      calendarId: "work",
      description: null,
      end: new Date("2026-08-24T15:00:00.000Z"),
      id: "long-meeting",
      location: null,
      start: new Date("2026-08-24T07:30:00.000Z"),
      title: "Long meeting",
    }],
  });
  const { service } = createPlanner(calendar);

  await assert.rejects(
    service.scheduleTaskInSlot("project-task", 9 * 60),
    /needs 60 minutes and does not fit/,
  );

  const data = await service.scheduleTaskInSlot("standalone", 9 * 60);
  assert.equal(data.timeBlocks[0]?.end, 9 * 60 + 30);
  await assert.rejects(
    service.scheduleTaskInSlot("standalone", 16 * 60),
    /already scheduled/,
  );
});

test("Tasks can be placed, reordered, scheduled, unscheduled, and removed", async () => {
  const { service } = createPlanner();

  await service.placeTask("project-task");
  await service.placeTask("standalone", "project-task");
  let data = await service.loadPlanner();
  assert.deepEqual(data.commitments.map(({ id }) => id), ["standalone", "project-task"]);

  await service.moveTask("project-task", "up");
  data = await service.createTimeBlock({
    end: 9 * 60 + 30,
    linkedTaskIds: ["project-task"],
    start: 9 * 60,
    title: "Advance outcome",
    type: TimeBlockType.Focus,
  });
  assert.deepEqual(data.commitments.map(({ id }) => id), ["project-task", "standalone"]);
  assert.equal(data.timeBlocks[0]?.title, "Advance outcome");
  assert.equal(data.availableTime.remainingMinutes, 450);
  assert.equal(
    data.commitments.find(({ id }) => id === "project-task")?.scheduledStart?.toISOString(),
    "2026-08-24T07:00:00.000Z",
  );
  assert.equal(
    data.commitments.find(({ id }) => id === "project-task")?.scheduledEnd?.toISOString(),
    "2026-08-24T07:30:00.000Z",
  );

  data = await service.unscheduleTask("project-task");
  assert.equal(data.timeBlocks.length, 1);
  assert.equal(data.timeBlocks[0]?.linkedTasks.length, 0);
  assert.equal(data.commitments.some(({ id }) => id === "project-task"), true);
  assert.equal(
    data.commitments.find(({ id }) => id === "project-task")?.scheduledStart,
    null,
  );

  data = await service.removeTask("standalone");
  assert.deepEqual(data.commitments.map(({ id }) => id), ["project-task"]);
  assert.equal(data.taskPool.some(({ id }) => id === "standalone"), true);
});

test("A scheduled Task can be moved, duplicated, split, and unscheduled", async () => {
  const { service } = createPlanner();
  let data = await service.createTimeBlock({
    end: 9 * 60 + 30,
    linkedTaskIds: ["standalone"],
    start: 9 * 60,
    title: "Call window",
    type: TimeBlockType.Admin,
  });
  const firstId = data.timeBlocks[0]?.id;
  assert.ok(firstId);

  data = await service.duplicateTimeBlock(firstId, 11 * 60);
  assert.equal(data.timeBlocks.length, 2);
  assert.equal(
    data.commitments.find(({ id }) => id === "standalone")?.scheduledStart?.toISOString(),
    "2026-08-24T07:00:00.000Z",
  );

  data = await service.moveTimeBlock(firstId, 12 * 60);
  const duplicateId = data.timeBlocks[0]?.id;
  assert.ok(duplicateId);
  assert.equal(
    data.commitments.find(({ id }) => id === "standalone")?.scheduledStart?.toISOString(),
    "2026-08-24T09:00:00.000Z",
  );

  data = await service.splitTimeBlock(duplicateId, 11 * 60 + 15);
  assert.equal(data.timeBlocks.length, 3);
  assert.equal(data.timeBlocks[0]?.linkedTasks[0]?.id, "standalone");

  data = await service.unscheduleTask("standalone");
  assert.equal(data.timeBlocks.every(({ linkedTasks }) => linkedTasks.length === 0), true);
  assert.equal(
    data.commitments.find(({ id }) => id === "standalone")?.scheduledStart,
    null,
  );
});

test("Time Blocks can be renamed, resized, deleted, and cannot overlap", async () => {
  const { service } = createPlanner();
  let data = await service.createTimeBlock({
    end: 9 * 60 + 30,
    start: 9 * 60,
    title: "Protected focus",
    type: TimeBlockType.Focus,
  });
  const blockId = data.timeBlocks[0]?.id;
  assert.ok(blockId);

  data = await service.updateTimeBlock(blockId, {
    notes: "One outcome only.",
    title: "Deep focus",
    type: TimeBlockType.Focus,
  });
  data = await service.moveTimeBlock(blockId, 10 * 60);
  data = await service.resizeTimeBlock(blockId, 10 * 60 + 45);
  assert.equal(data.timeBlocks[0]?.title, "Deep focus");
  assert.equal(data.timeBlocks[0]?.end - data.timeBlocks[0]?.start, 45);
  assert.equal(data.timeBlocks[0]?.notes, "One outcome only.");

  await assert.rejects(
    service.createTimeBlock({
      end: 11 * 60,
      start: 10 * 60 + 15,
      title: "Overlap",
      type: TimeBlockType.Admin,
    }),
    /cannot overlap/,
  );

  data = await service.deleteTimeBlock(blockId);
  assert.equal(data.timeBlocks.length, 0);
});

test("Time Blocks merge, split, lock, and maintain Task and Project links", async () => {
  const { service } = createPlanner();
  let data = await service.createTimeBlock({
    end: 9 * 60 + 30,
    linkedProjectIds: ["project"],
    linkedTaskIds: ["project-task"],
    notes: "First half",
    start: 9 * 60,
    title: "Outcome work",
    type: TimeBlockType.Focus,
  });
  const firstId = data.timeBlocks[0]?.id;
  assert.ok(firstId);

  data = await service.createTimeBlock({
    end: 10 * 60,
    linkedTaskIds: ["standalone"],
    notes: "Second half",
    start: 9 * 60 + 30,
    title: "Outcome work",
    type: TimeBlockType.Focus,
  });
  const secondId = data.timeBlocks[1]?.id;
  assert.ok(secondId);

  data = await service.mergeTimeBlocks(firstId, secondId);
  assert.equal(data.timeBlocks.length, 1);
  assert.deepEqual(data.timeBlocks[0]?.linkedTasks.map(({ id }) => id).sort(), [
    "project-task",
    "standalone",
  ]);
  assert.equal(data.timeBlocks[0]?.linkedProjects[0]?.id, "project");

  data = await service.splitTimeBlock(firstId, 9 * 60 + 30);
  assert.equal(data.timeBlocks.length, 2);
  assert.equal(data.timeBlocks[1]?.id, "second-block");

  data = await service.setTimeBlockLocked(firstId, true);
  await assert.rejects(service.moveTimeBlock(firstId, 8 * 60), /Unlock/);
  await assert.rejects(service.deleteTimeBlock(firstId), /Unlock/);

  data = await service.setTimeBlockLocked(firstId, false);
  data = await service.unlinkTaskFromTimeBlock(firstId, "standalone");
  data = await service.unlinkProjectFromTimeBlock(firstId, "project");
  assert.equal(data.timeBlocks[0]?.linkedTasks.length, 1);
  assert.equal(data.timeBlocks[0]?.linkedProjects.length, 0);

  data = await service.linkTaskToTimeBlock(firstId, "standalone");
  data = await service.linkProjectToTimeBlock(firstId, "project");
  assert.equal(data.timeBlocks[0]?.linkedTasks.length, 2);
  assert.equal(data.timeBlocks[0]?.linkedProjects.length, 1);
});
