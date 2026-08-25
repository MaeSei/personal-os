import assert from "node:assert/strict";
import test from "node:test";

import { InboxService } from "../src/application/InboxService";
import {
  ItemType,
  NextActionCalculator,
  Status,
  initialAreas,
  isProject,
  isTask,
  type Area,
} from "../src/domain";
import type { AreaRepository } from "../src/repositories/AreaRepository";
import { MockItemRepository } from "../src/repositories/MockItemRepository";

class AreaMemoryRepository implements AreaRepository {
  constructor(private areas: readonly Area[]) {}

  get(): Promise<readonly Area[]> {
    return Promise.resolve(this.areas);
  }

  save(areas: readonly Area[]): Promise<void> {
    this.areas = areas;
    return Promise.resolve();
  }
}

function createService(ids: readonly string[]) {
  const itemRepository = new MockItemRepository();
  const areaRepository = new AreaMemoryRepository(initialAreas);
  const remainingIds = [...ids];
  const service = new InboxService(itemRepository, areaRepository, () => {
    const id = remainingIds.shift();
    if (!id) throw new Error("Test id supply exhausted.");
    return id;
  });

  return { itemRepository, service };
}

test("universal capture persists only an untriaged Inbox Item", async () => {
  const { itemRepository, service } = createService(["capture-1", "capture-2"]);

  const first = await service.capture("  Call MGI  ");
  const second = await service.capture("Book RV inspection");
  const storedItems = await itemRepository.get();

  assert.equal(first.title, "Call MGI");
  assert.equal(first.type, ItemType.Idea);
  assert.equal(first.status, Status.Inbox);
  assert.equal(first.areaId, null);
  assert.equal(first.projectId, null);
  assert.equal(first.energyCost, 3);
  assert.equal(first.dueDate, undefined);
  assert.equal(first.scheduledDate, undefined);
  assert.deepEqual(
    storedItems.map((item) => item.id),
    [second.id, first.id],
  );
  assert.equal(new Set(storedItems.map((item) => item.id)).size, 2);
});

test("processing an Inbox Item as a standalone Task replaces its identity", async () => {
  const { itemRepository, service } = createService(["inbox-1"]);
  const inboxItem = await service.capture("Send the proposal");

  const task = await service.processAsTask({
    areaId: "work",
    context: "Office",
    dueDate: "2026-08-28",
    durationMinutes: 30,
    energyCost: 2,
    itemId: inboxItem.id,
    projectId: null,
    scheduledDate: "2026-08-25",
  });
  const storedItems = await itemRepository.get();

  assert.equal(storedItems.length, 1);
  assert.equal(storedItems[0]?.id, inboxItem.id);
  assert.ok(isTask(task));
  assert.equal(task.areaId, "work");
  assert.equal(task.projectId, null);
  assert.equal(task.durationMinutes, 30);
  assert.equal((await service.getInbox()).length, 0);
});

test("processing an Inbox Item as a Project creates no implicit Task", async () => {
  const { itemRepository, service } = createService([
    "inbox-1",
    "task-1",
  ]);
  const inboxItem = await service.capture("Make the house ready for winter");

  const project = await service.processAsProject({
    areaId: "home",
    description: null,
    itemId: inboxItem.id,
    outcome: "The house is prepared before the first frost.",
    title: "Prepare the house for winter",
  });

  assert.ok(isProject(project));
  assert.equal(project.id, inboxItem.id);
  assert.deepEqual(project.children, []);
  assert.equal((await itemRepository.get()).length, 1);
  assert.equal((await service.getInbox()).length, 0);

  const task = await service.addFirstTask(project.id, "Book the boiler service");
  const storedProject = (await itemRepository.get()).find(isProject);

  assert.ok(storedProject);
  assert.equal(storedProject.children.length, 1);
  assert.ok(isTask(task));
  assert.equal(task.projectId, project.id);
  assert.equal(task.areaId, project.areaId);
});

test("a Project Task becomes the Project's single focus action", async () => {
  const { itemRepository, service } = createService(["project-1", "task-1"]);
  const projectIdea = await service.capture("Prepare the launch");
  const project = await service.processAsProject({
    areaId: "work",
    itemId: projectIdea.id,
    outcome: "The launch is ready for customers.",
    title: "Prepare the launch",
  });
  const taskIdea = await service.capture("Write the launch checklist");
  const task = await service.processAsTask({
    areaId: "work",
    itemId: taskIdea.id,
    projectId: project.id,
  });

  const items = await itemRepository.get();
  const actions = new NextActionCalculator().getTodayActions(items);

  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  assert.deepEqual(actions.map((item) => item.id), [task.id]);
});

test("Someday, Reference, and Delete each remove an Item from Inbox", async () => {
  const { itemRepository, service } = createService(["one", "two", "three"]);
  const someday = await service.capture("Learn pottery");
  await service.processAsSomeday(someday.id);

  const reference = await service.capture("Door measurements");
  await service.processAsReference(reference.id);

  const deleted = await service.capture("Discard this");
  await service.deleteInboxItem(deleted.id);

  const items = await itemRepository.get();
  assert.equal(items.filter((item) => item.status === Status.Inbox).length, 0);
  assert.equal(items.find((item) => item.id === someday.id)?.status, Status.Someday);
  assert.equal(
    items.find((item) => item.id === reference.id)?.type,
    ItemType.Reference,
  );
  assert.equal(items.some((item) => item.id === deleted.id), false);
});
