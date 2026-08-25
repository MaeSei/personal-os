import {
  Status,
  convertTaskToProject,
  createTask as createDomainTask,
  findTask,
  getProjectForItem,
  insertTaskIntoItems,
  isProject,
  removeTaskFromItems,
  reorderProjectTasks,
  replaceTaskInItems,
  updateTask as reviseTask,
  type Area,
  type Item,
  type Project,
  type Task,
} from "../domain";
import type {
  TaskAssignmentInput,
  TaskDetailData,
  TaskFeature,
  TaskWriteInput,
} from "../features/contracts/TaskFeature";
import type { AreaRepository } from "../repositories/AreaRepository";
import type { ItemRepository } from "../repositories/ItemRepository";

type IdGenerator = () => string;

function containsId(items: readonly Item[], id: string): boolean {
  return items.some(
    (item) => item.id === id || containsId(item.children, id),
  );
}

function taskWriteInput(task: Task, assignment?: TaskAssignmentInput): TaskWriteInput {
  return {
    areaId: assignment?.areaId ?? task.areaId,
    context: task.context,
    contexts: task.contexts,
    description: task.description,
    dueDate: task.dueDate,
    durationMinutes: task.durationMinutes,
    effort: task.effort,
    estimateConfidence: task.estimateConfidence,
    estimatedDuration: task.estimatedDuration,
    energyCost: task.energyCost,
    preferredContext: task.preferredContext,
    preferredTime: task.preferredTime,
    projectId: assignment ? assignment.projectId : task.projectId,
    scheduledDate: task.scheduledDate,
    status: task.status,
    title: task.title,
  };
}

/** Application boundary for the canonical Task experience. */
class TaskService implements TaskFeature {
  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly areaRepository: AreaRepository,
    private readonly createId: IdGenerator,
  ) {}

  async loadTask(taskId: string): Promise<TaskDetailData | null> {
    const [items, areas] = await Promise.all([
      this.itemRepository.get(),
      this.areaRepository.get(),
    ]);
    const task = findTask(items, taskId);
    if (!task) return null;
    const projects = items.filter(isProject);
    const project = getProjectForItem(task, projects);
    const history: TaskDetailData["history"] = [
      { at: task.createdAt, kind: "created" },
      { at: task.updatedAt, kind: "updated" },
      ...(task.status === Status.Completed
        ? [{ approximate: true, at: task.updatedAt, kind: "completed" as const }]
        : []),
    ];

    return {
      area: areas.find(({ id }) => id === task.areaId) ?? null,
      areas,
      dependencies: [],
      history,
      notes: [],
      project,
      projects,
      task,
    };
  }

  async createTask(input: TaskWriteInput): Promise<Task> {
    return (await this.createTasks([input]))[0];
  }

  async createTasks(inputs: readonly TaskWriteInput[]): Promise<readonly Task[]> {
    if (inputs.length === 0) return [];
    const [storedItems, areas] = await Promise.all([
      this.itemRepository.get(),
      this.areaRepository.get(),
    ]);
    let items = storedItems;
    const tasks: Task[] = [];

    for (const input of inputs) {
      this.validateAssignment(input, items, areas);
      const now = new Date();
      const task = createDomainTask({
        ...input,
        attentionScore: 50,
        createdAt: now,
        effort: input.effort ?? input.energyCost,
        id: this.createUniqueId(items),
      });
      items = insertTaskIntoItems(items, task, now);
      tasks.push(task);
    }

    await this.itemRepository.save(items);
    return tasks;
  }

  async updateTask(taskId: string, input: TaskWriteInput): Promise<Task> {
    const [items, areas] = await Promise.all([
      this.itemRepository.get(),
      this.areaRepository.get(),
    ]);
    const task = findTask(items, taskId);
    if (!task) throw new Error("The Task no longer exists.");
    this.validateAssignment(input, items, areas);
    const now = new Date();
    const updated = reviseTask(task, {
      ...input,
      attentionScore: task.attentionScore,
      effort: input.effort ?? task.effort,
      estimateConfidence:
        input.estimateConfidence === undefined
          ? task.estimateConfidence
          : input.estimateConfidence,
      scheduledEnd: task.scheduledEnd,
      scheduledStart: task.scheduledStart,
      tags: task.tags,
    }, now);
    const nextItems = task.projectId === updated.projectId
      ? replaceTaskInItems(items, updated, now)
      : insertTaskIntoItems(
          removeTaskFromItems(items, taskId, now).items,
          updated,
          now,
        );

    await this.itemRepository.save(nextItems);
    return updated;
  }

  async deleteTask(taskId: string): Promise<void> {
    const items = await this.itemRepository.get();
    const result = removeTaskFromItems(items, taskId);
    if (!result.task) throw new Error("The Task no longer exists.");
    await this.itemRepository.save(result.items);
  }

  async duplicateTask(taskId: string): Promise<Task> {
    const [items, areas] = await Promise.all([
      this.itemRepository.get(),
      this.areaRepository.get(),
    ]);
    const source = findTask(items, taskId);
    if (!source) throw new Error("The Task no longer exists.");
    this.validateAssignment(source, items, areas);
    const now = new Date();
    const duplicate = createDomainTask({
      ...taskWriteInput(source),
      attentionScore: source.attentionScore,
      createdAt: now,
      effort: source.effort,
      id: this.createUniqueId(items),
      scheduledDate: null,
      scheduledEnd: null,
      scheduledStart: null,
      status: Status.Active,
      tags: source.tags,
      title: `${source.title} copy`,
    });
    await this.itemRepository.save(insertTaskIntoItems(items, duplicate, now));
    return duplicate;
  }

  async moveTask(taskId: string, input: TaskAssignmentInput): Promise<Task> {
    const task = findTask(await this.itemRepository.get(), taskId);
    if (!task) throw new Error("The Task no longer exists.");
    return this.updateTask(taskId, taskWriteInput(task, input));
  }

  async detachFromProject(taskId: string): Promise<Task> {
    const task = findTask(await this.itemRepository.get(), taskId);
    if (!task) throw new Error("The Task no longer exists.");
    if (!task.projectId) return task;
    return this.moveTask(taskId, { areaId: task.areaId, projectId: null });
  }

  async convertToProject(taskId: string, outcome: string): Promise<Project> {
    const items = await this.itemRepository.get();
    const result = convertTaskToProject(
      items,
      taskId,
      this.createUniqueId(items),
      outcome,
    );
    if (!result.project) throw new Error("The Task no longer exists.");
    await this.itemRepository.save(result.items);
    return result.project;
  }

  async reorderTask(
    projectId: string,
    taskId: string,
    direction: "down" | "up",
  ): Promise<void> {
    const items = await this.itemRepository.get();
    await this.itemRepository.save(
      reorderProjectTasks(items, projectId, taskId, direction),
    );
  }

  private createUniqueId(items: readonly Item[]): string {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const id = this.createId();
      if (!containsId(items, id)) return id;
    }
    throw new Error("Atlas could not create a unique Item id.");
  }

  private validateAssignment(
    input: Pick<TaskWriteInput, "areaId" | "projectId">,
    items: readonly Item[],
    areas: readonly Area[],
  ): void {
    if (!areas.some(({ id }) => id === input.areaId)) {
      throw new Error("A Task requires a configured Area.");
    }
    if (!input.projectId) return;
    const project = items.find(
      (item) => isProject(item) && item.id === input.projectId,
    );
    if (!project || project.areaId !== input.areaId) {
      throw new Error("A Task and its Project must share an Area.");
    }
  }
}

export { TaskService };
