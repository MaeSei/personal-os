import {
  convertInboxToProject,
  convertInboxToReference,
  convertInboxToTask,
  createInboxItem,
  createTask,
  isProject,
  isTask,
  ItemType,
  moveInboxToSomeday,
  Status,
  type Item,
  type ItemId,
  type Project,
  type Task,
} from "../domain";
import type {
  InboxFeature,
  InboxProcessingData,
  ProcessProjectInput,
  ProcessTaskInput,
} from "@/features/contracts/InboxFeature";
import type { AreaRepository } from "../repositories/AreaRepository";
import type { ItemRepository } from "../repositories/ItemRepository";

type IdGenerator = () => string;

function getInboxItems(items: readonly Item[]): readonly Item[] {
  return items.filter(
    (item) => item.type !== ItemType.Project && item.status === Status.Inbox,
  );
}

function containsId(items: readonly Item[], id: ItemId): boolean {
  return items.some(
    (item) => item.id === id || containsId(item.children, id),
  );
}

function replaceTopLevelItem(
  items: readonly Item[],
  id: ItemId,
  replacement: Item | null,
): readonly Item[] {
  let inserted = false;

  return items.flatMap((item) => {
    if (item.id !== id) {
      return [item];
    }

    if (replacement && !inserted) {
      inserted = true;
      return [replacement];
    }

    return [];
  });
}

/** Application boundary for capture and one-at-a-time Inbox processing. */
class InboxService implements InboxFeature {
  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly areaRepository: AreaRepository,
    private readonly createId: IdGenerator,
  ) {}

  private createUniqueId(items: readonly Item[]): ItemId {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const id = this.createId();
      if (!containsId(items, id)) {
        return id;
      }
    }

    throw new Error("Atlas could not create a unique Item id.");
  }

  async capture(title: string): Promise<Item> {
    const items = await this.itemRepository.get();
    const item = createInboxItem({
      createdAt: new Date(),
      id: this.createUniqueId(items),
      title,
    });

    await this.itemRepository.save([item, ...items]);
    return item;
  }

  async getInbox(): Promise<readonly Item[]> {
    return getInboxItems(await this.itemRepository.get());
  }

  async getProcessingData(): Promise<InboxProcessingData> {
    const [items, areas] = await Promise.all([
      this.itemRepository.get(),
      this.areaRepository.get(),
    ]);

    return {
      areas,
      items: getInboxItems(items),
      projects: items.filter(isProject),
    };
  }

  async processAsTask(input: ProcessTaskInput): Promise<Task> {
    const [items, areas] = await Promise.all([
      this.itemRepository.get(),
      this.areaRepository.get(),
    ]);
    const inboxItem = this.requireInboxItem(items, input.itemId);

    if (!areas.some((area) => area.id === input.areaId)) {
      throw new Error("A Task requires a configured Area.");
    }

    const project = input.projectId
      ? items.filter(isProject).find((item) => item.id === input.projectId)
      : null;

    if (input.projectId && (!project || project.areaId !== input.areaId)) {
      throw new Error("The selected Project must belong to the Task Area.");
    }

    const task = convertInboxToTask(inboxItem, input, new Date());
    await this.itemRepository.save(
      replaceTopLevelItem(items, inboxItem.id, task),
    );
    return task;
  }

  async processAsProject(input: ProcessProjectInput): Promise<Project> {
    const [items, areas] = await Promise.all([
      this.itemRepository.get(),
      this.areaRepository.get(),
    ]);
    const inboxItem = this.requireInboxItem(items, input.itemId);

    if (!areas.some((area) => area.id === input.areaId)) {
      throw new Error("A Project requires a configured Area.");
    }

    const project = convertInboxToProject(inboxItem, input, new Date());
    await this.itemRepository.save(
      replaceTopLevelItem(items, inboxItem.id, project),
    );
    return project;
  }

  async processAsSomeday(itemId: ItemId): Promise<Item> {
    return this.replaceInbox(itemId, moveInboxToSomeday);
  }

  async processAsReference(itemId: ItemId): Promise<Item> {
    return this.replaceInbox(itemId, convertInboxToReference);
  }

  async deleteInboxItem(itemId: ItemId): Promise<void> {
    const items = await this.itemRepository.get();
    this.requireInboxItem(items, itemId);
    await this.itemRepository.save(replaceTopLevelItem(items, itemId, null));
  }

  async addFirstTask(projectId: ItemId, title: string): Promise<Task> {
    const items = await this.itemRepository.get();
    const project = items.find(
      (item): item is Project => item.id === projectId && isProject(item),
    );

    if (!project) {
      throw new Error("The Project no longer exists.");
    }

    if (project.children.some(isTask)) {
      throw new Error("This Project already has a first Task.");
    }

    const task = createTask({
      areaId: project.areaId,
      attentionScore: project.attentionScore,
      createdAt: new Date(),
      id: this.createUniqueId(items),
      projectId: project.id,
      status: Status.Today,
      title,
    });
    const updatedProject: Project = {
      ...project,
      children: [task, ...project.children],
      updatedAt: new Date(),
    };

    await this.itemRepository.save(
      replaceTopLevelItem(items, project.id, updatedProject),
    );
    return task;
  }

  private requireInboxItem(items: readonly Item[], itemId: ItemId): Item {
    const item = items.find((candidate) => candidate.id === itemId);

    if (!item || item.status !== Status.Inbox) {
      throw new Error("The Inbox Item no longer exists.");
    }

    return item;
  }

  private async replaceInbox(
    itemId: ItemId,
    convert: (item: Item, processedAt: Date) => Item,
  ): Promise<Item> {
    const items = await this.itemRepository.get();
    const inboxItem = this.requireInboxItem(items, itemId);
    const processedItem = convert(inboxItem, new Date());

    await this.itemRepository.save(
      replaceTopLevelItem(items, inboxItem.id, processedItem),
    );
    return processedItem;
  }
}

export { InboxService };
