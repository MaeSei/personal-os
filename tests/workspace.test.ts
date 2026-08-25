import assert from "node:assert/strict";
import test from "node:test";

import { WorkspaceService } from "../src/application/WorkspaceService";
import {
  DayPlanStatus,
  Status,
  createProject,
  createTask,
  findTask,
  initialAreas,
  type Area,
} from "../src/domain";
import type { AreaRepository } from "../src/repositories/AreaRepository";
import { MockDayPlanRepository } from "../src/repositories/MockDayPlanRepository";
import { MockItemRepository } from "../src/repositories/MockItemRepository";
import {
  countActiveWorkspaceFilters,
  getDailyMoveTarget,
} from "../src/features/workspace/presentation";

class AreaMemoryRepository implements AreaRepository {
  constructor(private areas: readonly Area[]) {}
  get(): Promise<readonly Area[]> { return Promise.resolve(this.areas); }
  save(areas: readonly Area[]): Promise<void> {
    this.areas = areas;
    return Promise.resolve();
  }
}

const createdAt = new Date("2026-08-20T08:00:00.000Z");

function buildWorkspace() {
  const projectTask = createTask({
    areaId: "work",
    createdAt,
    id: "project-task",
    projectId: "work-project",
    status: Status.Today,
    title: "Advance outcome",
  });
  const scheduledTask = createTask({
    areaId: "work",
    createdAt,
    id: "scheduled",
    projectId: "work-project",
    scheduledEnd: new Date("2026-08-25T08:00:00.000Z"),
    scheduledStart: new Date("2026-08-25T07:30:00.000Z"),
    status: Status.Active,
    title: "Scheduled work",
  });
  const standalone = createTask({
    areaId: "home",
    createdAt,
    id: "standalone",
    status: Status.Active,
    title: "Call electrician",
  });
  const project = {
    ...createProject({
      areaId: "work",
      createdAt,
      energyLevel: 3,
      id: "work-project",
      outcome: "The release is ready.",
      title: "Release Project",
    }),
    children: [projectTask, scheduledTask],
  };
  const items = new MockItemRepository([project, standalone]);
  const plans = new MockDayPlanRepository();
  const service = new WorkspaceService(
    items,
    new AreaMemoryRepository(initialAreas),
    plans,
    {
      now: new Date("2026-08-25T08:00:00.000Z"),
      timeZone: "Europe/Stockholm",
    },
  );
  return { items, plans, service };
}

test("Daily Workspace begins empty and never infers intent from Task status or schedule", async () => {
  const { service } = buildWorkspace();
  const workspace = await service.loadWorkspace();

  assert.deepEqual(workspace.today.pinned, []);
  assert.deepEqual(workspace.today.groups, []);
  assert.equal(workspace.today.focused, null);
  assert.deepEqual(
    workspace.today.available.map(({ task }) => task.id),
    ["project-task", "scheduled", "standalone"],
  );
  assert.deepEqual(
    workspace.projectGroups.flatMap(({ projects }) =>
      projects.map(({ project }) => project.id),
    ),
    ["work-project"],
  );
});

test("Workspace presentation counts filters and protects reorder boundaries", async () => {
  const { service } = buildWorkspace();
  const tasks = (await service.loadWorkspace()).today.available;

  assert.equal(countActiveWorkspaceFilters({}), 0);
  assert.equal(countActiveWorkspaceFilters({ areaId: "work", maxEnergy: 3 }), 2);
  assert.equal(getDailyMoveTarget(tasks, "project-task", "up"), null);
  assert.deepEqual(getDailyMoveTarget(tasks, "project-task", "down"), {
    beforeTaskId: "standalone",
  });
  assert.equal(getDailyMoveTarget(tasks, "standalone", "down"), null);
});

test("Daily Workspace persists grouping, pinning, focus, and explicit order", async () => {
  const { plans, service } = buildWorkspace();

  await service.placeTask({ taskId: "standalone" });
  await service.placeTask({ group: "Deep work", taskId: "project-task" });
  await service.placeTask({ beforeTaskId: "standalone", taskId: "scheduled" });
  await service.setTaskPinned("scheduled", true);
  await service.focusTask("project-task");

  const workspace = await service.loadWorkspace();
  const plan = await plans.get("2026-08-25");
  assert.deepEqual(plan?.taskIds, ["scheduled", "standalone", "project-task"]);
  assert.equal(plan?.status, DayPlanStatus.Started);
  assert.deepEqual(
    workspace.today.pinned.map(({ task }) => task.id),
    ["scheduled"],
  );
  assert.deepEqual(
    workspace.today.groups.map(({ title, tasks }) => ({
      tasks: tasks.map(({ task }) => task.id),
      title,
    })),
    [
      { tasks: ["standalone"], title: "Ungrouped" },
      { tasks: ["project-task"], title: "Deep work" },
    ],
  );
  assert.equal(workspace.today.focused?.task.id, "project-task");
  assert.deepEqual(workspace.today.available, []);
});

test("Daily Workspace filters context, returns Tasks to the pool, and archives globally", async () => {
  const { items, service } = buildWorkspace();
  await service.placeTask({ taskId: "project-task" });
  await service.placeTask({ taskId: "standalone" });

  const filtered = await service.loadWorkspace({ areaId: "work" });
  assert.deepEqual(
    filtered.today.groups.flatMap(({ tasks }) => tasks.map(({ task }) => task.id)),
    ["project-task"],
  );

  await service.removeTask("project-task");
  let workspace = await service.loadWorkspace();
  assert.equal(
    workspace.today.available.some(({ task }) => task.id === "project-task"),
    true,
  );

  await service.archiveTask("standalone");
  workspace = await service.loadWorkspace();
  assert.equal(
    workspace.today.groups.flatMap(({ tasks }) => tasks).length,
    0,
  );
  assert.equal(findTask(await items.get(), "standalone")?.status, Status.Archived);
});
