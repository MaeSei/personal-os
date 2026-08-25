import assert from "node:assert/strict";
import test from "node:test";

import { ManualBreakdownService } from "../src/application/BreakdownService";
import { ProjectService } from "../src/application/ProjectService";
import {
  Status,
  createProject,
  createTask,
  initialAreas,
  projectStatuses,
  type Area,
  type Project,
} from "../src/domain";
import type { AreaRepository } from "../src/repositories/AreaRepository";
import { MockItemRepository } from "../src/repositories/MockItemRepository";

class AreaMemoryRepository implements AreaRepository {
  constructor(private areas: readonly Area[] = initialAreas) {}
  get(): Promise<readonly Area[]> {
    return Promise.resolve(this.areas);
  }
  save(areas: readonly Area[]): Promise<void> {
    this.areas = areas;
    return Promise.resolve();
  }
}

function makeProject(id: string, status: Project["status"] = Status.Active) {
  return {
    ...createProject({
      areaId: "work",
      createdAt: new Date("2026-08-01T08:00:00.000Z"),
      energyLevel: 3,
      id,
      outcome: `${id} outcome`,
      title: id,
    }),
    status,
  };
}

function createWorkspace(items: readonly Project[] = [makeProject("project")]) {
  const itemRepository = new MockItemRepository(items);
  const areaRepository = new AreaMemoryRepository();
  let nextId = 0;
  const service = new ProjectService(
    itemRepository,
    areaRepository,
    () => `task-${++nextId}`,
  );
  return { itemRepository, service };
}

test("Project workspace derives every Project status", async () => {
  const projects = projectStatuses.map((status, index) =>
    makeProject(`project-${index}`, status),
  );
  const { service } = createWorkspace(projects);

  for (const status of projectStatuses) {
    const result = await service.loadOverview({ status });
    assert.deepEqual(result.projects.map(({ project }) => project.status), [status]);
  }
});

test("Task create, edit, reorder, move, and delete update Project detail", async () => {
  const { itemRepository, service } = createWorkspace();
  const first = await service.createTask({
    areaId: "work",
    energyCost: 2,
    projectId: "project",
    status: Status.Active,
    title: "First",
  });
  const second = await service.createTask({
    areaId: "work",
    energyCost: 3,
    projectId: "project",
    status: Status.Waiting,
    title: "Second",
  });

  await service.reorderTask("project", second.id, "up");
  let detail = await service.loadProject("project");
  assert.deepEqual(detail?.detail.taskRoots.map((task) => task.id), [second.id, first.id]);

  await service.updateTask(first.id, {
    areaId: "work",
    context: "Office",
    dueDate: "2026-09-03",
    durationMinutes: 45,
    energyCost: 2,
    projectId: "project",
    scheduledDate: "2026-09-01",
    status: Status.Blocked,
    title: "First revised",
  });
  detail = await service.loadProject("project");
  assert.equal(detail?.detail.metrics.counts.blocked, 1);
  assert.equal(detail?.detail.metrics.counts.waiting, 1);
  assert.equal(detail?.detail.timeline.length, 2);

  await service.updateTask(second.id, {
    areaId: "work",
    energyCost: 3,
    projectId: "project",
    status: Status.Completed,
    title: "Second",
  });
  detail = await service.loadProject("project");
  assert.equal(detail?.detail.metrics.counts.completed, 1);
  assert.equal(detail?.detail.metrics.progress, 50);

  await service.updateTask(first.id, {
    areaId: "work",
    energyCost: 2,
    projectId: null,
    status: Status.Today,
    title: "Standalone",
  });
  detail = await service.loadProject("project");
  assert.deepEqual(detail?.detail.taskRoots.map((task) => task.id), [second.id]);
  assert.equal((await itemRepository.get()).some((item) => item.id === first.id), true);

  await service.deleteTask(second.id);
  detail = await service.loadProject("project");
  assert.equal(detail?.detail.taskRoots.length, 0);
});

test("manual breakdown adds ordered Tasks through the replaceable service", async () => {
  const { service } = createWorkspace();
  const breakdown = new ManualBreakdownService(service);

  await breakdown.breakDown({
    projectId: "project",
    tasks: [
      { areaId: "work", projectId: "project", title: "Clarify scope" },
      { areaId: "work", projectId: "project", title: "Draft plan" },
    ],
  });
  const detail = await service.loadProject("project");

  assert.deepEqual(
    detail?.detail.taskRoots.map((task) => task.title),
    ["Clarify scope", "Draft plan"],
  );
});

test("nested sibling Tasks can be reordered without flattening hierarchy", async () => {
  const createdAt = new Date("2026-08-02T08:00:00.000Z");
  const first = createTask({
    areaId: "work",
    createdAt,
    id: "nested-1",
    projectId: "nested-project",
    status: Status.Active,
    title: "First nested",
  });
  const second = createTask({
    areaId: "work",
    createdAt,
    id: "nested-2",
    projectId: "nested-project",
    status: Status.Active,
    title: "Second nested",
  });
  const parent = {
    ...createTask({
      areaId: "work",
      createdAt,
      id: "parent",
      projectId: "nested-project",
      status: Status.Active,
      title: "Parent",
    }),
    children: [first, second],
  };
  const project = {
    ...makeProject("nested-project"),
    children: [parent],
  };
  const { service } = createWorkspace([project]);

  await service.reorderTask(project.id, second.id, "up");
  const detail = await service.loadProject(project.id);
  const nested = detail?.detail.taskRoots[0]?.children ?? [];

  assert.deepEqual(nested.map((task) => task.id), [second.id, first.id]);
});
