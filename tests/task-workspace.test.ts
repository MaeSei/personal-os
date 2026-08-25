import assert from "node:assert/strict";
import test from "node:test";

import { TaskService } from "../src/application/TaskService";
import {
  EstimateConfidence,
  Status,
  createProject,
  createTask,
  findTask,
  initialAreas,
  isProject,
  isTask,
  type Area,
} from "../src/domain";
import type { AreaRepository } from "../src/repositories/AreaRepository";
import { MockItemRepository } from "../src/repositories/MockItemRepository";

class AreaMemoryRepository implements AreaRepository {
  constructor(private areas: readonly Area[] = initialAreas) {}
  get(): Promise<readonly Area[]> { return Promise.resolve(this.areas); }
  save(areas: readonly Area[]): Promise<void> {
    this.areas = areas;
    return Promise.resolve();
  }
}

const createdAt = new Date("2026-08-20T08:00:00.000Z");

function fixture() {
  const task = {
    ...createTask({
      areaId: "work",
      createdAt,
      description: "The complete description",
      energyCost: 2,
      estimatedDuration: 45,
      id: "task",
      preferredContext: "Office",
      projectId: "project",
      scheduledDate: "2026-08-26",
      status: Status.Completed,
      title: "Deliver the result",
    }),
    updatedAt: new Date("2026-08-25T09:30:00.000Z"),
  };
  const project = {
    ...createProject({
      areaId: "work",
      createdAt,
      energyLevel: 3,
      id: "project",
      outcome: "The result is available",
      title: "Delivery",
    }),
    children: [task],
  };
  const homeProject = createProject({
    areaId: "home",
    createdAt,
    energyLevel: 2,
    id: "home-project",
    outcome: "Home is cared for",
    title: "Home Project",
  });
  const items = new MockItemRepository([project, homeProject]);
  let nextId = 0;
  const service = new TaskService(
    items,
    new AreaMemoryRepository(),
    () => `generated-${++nextId}`,
  );
  return { items, service, task };
}

test("Task detail resolves Project context and honest lifecycle data", async () => {
  const { service } = fixture();
  const detail = await service.loadTask("task");

  assert.equal(detail?.area?.title, "Work");
  assert.equal(detail?.project?.outcome, "The result is available");
  assert.deepEqual(detail?.dependencies, []);
  assert.deepEqual(detail?.notes, []);
  assert.deepEqual(detail?.task.contexts, ["Office"]);
  assert.deepEqual(detail?.history.map(({ kind }) => kind), [
    "created",
    "updated",
    "completed",
  ]);
  assert.equal(detail?.history[2]?.approximate, true);
});

test("Task edit, move, and detach preserve valid Area relationships", async () => {
  const { items, service } = fixture();
  await service.updateTask("task", {
    areaId: "work",
    dueDate: "2026-09-01",
    effort: 5,
    energyCost: 4,
    estimateConfidence: EstimateConfidence.Medium,
    projectId: "project",
    status: Status.Today,
    title: "Deliver revised result",
  });
  await service.moveTask("task", { areaId: "home", projectId: "home-project" });
  const detached = await service.detachFromProject("task");

  assert.equal(detached.areaId, "home");
  assert.equal(detached.projectId, null);
  assert.equal(detached.effort, 5);
  assert.equal(detached.energyCost, 4);
  assert.equal(detached.estimateConfidence, EstimateConfidence.Medium);
  assert.equal(findTask(await items.get(), "task")?.title, "Deliver revised result");
  await assert.rejects(
    service.moveTask("task", { areaId: "home", projectId: "project" }),
    /share an Area/,
  );
});

test("duplicate is a distinct unscheduled active Task without copied children", async () => {
  const { items, service } = fixture();
  const duplicate = await service.duplicateTask("task");

  assert.equal(duplicate.id, "generated-1");
  assert.equal(duplicate.title, "Deliver the result copy");
  assert.equal(duplicate.status, Status.Active);
  assert.equal(duplicate.projectId, "project");
  assert.equal(duplicate.scheduledDate, null);
  assert.deepEqual(duplicate.children, []);
  assert.ok(findTask(await items.get(), "task"));
  assert.ok(findTask(await items.get(), duplicate.id));
});

test("conversion replaces the Task with one Project and rehomes child work", async () => {
  const { items, service, task } = fixture();
  const child = createTask({
    areaId: "work",
    createdAt,
    id: "child",
    projectId: "project",
    status: Status.Active,
    title: "Child action",
  });
  const stored = await items.get();
  await items.save(stored.map((item) => item.id === "project"
    ? { ...item, children: [{ ...task, children: [child] }] }
    : item));

  const converted = await service.convertToProject("task", "Result is delivered");
  const after = await items.get();
  const convertedStored = after.find((item) => item.id === converted.id);

  assert.equal(converted.id, "generated-1");
  assert.equal(converted.outcome, "Result is delivered");
  assert.equal(findTask(after, "task"), null);
  assert.equal(after.filter((item) => item.id === converted.id).length, 1);
  assert.ok(convertedStored && isProject(convertedStored));
  const rehomed = convertedStored?.children.find(isTask);
  assert.equal(rehomed?.projectId, converted.id);
  assert.equal(rehomed?.parentId, converted.id);
});

test("deleting a Task removes it exactly once", async () => {
  const { items, service } = fixture();
  await service.deleteTask("task");
  assert.equal(findTask(await items.get(), "task"), null);
  await assert.rejects(service.deleteTask("task"), /no longer exists/);
});
