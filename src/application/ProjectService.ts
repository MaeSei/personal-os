import {
  buildProjectDetail,
  buildProjectOverview,
  createProject,
  createTask,
  filterProjectOverviews,
  findTask,
  insertTaskIntoItems,
  isArea,
  isProject,
  removeTaskFromItems,
  reorderProjectTasks,
  replaceTaskInItems,
  updateTask as reviseTask,
  type Area,
  type Item,
  type Project,
  type ProjectFilters,
  type Task,
} from "../domain";
import type {
  CompleteOnboardingInput,
  ProjectDetailData,
  ProjectFeature,
  ProjectOverviewData,
  TaskWriteInput,
} from "@/features/contracts/ProjectFeature";
import type { AreaRepository } from "../repositories/AreaRepository";
import type { ItemRepository } from "../repositories/ItemRepository";

type IdGenerator = () => string;

function containsId(items: readonly Item[], id: string): boolean {
  return items.some(
    (item) => item.id === id || containsId(item.children, id),
  );
}

/** Application boundary for Project workspaces and Task commands. */
class ProjectService implements ProjectFeature {
  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly areaRepository: AreaRepository,
    private readonly createId: IdGenerator,
  ) {}

  async completeOnboarding(input: CompleteOnboardingInput): Promise<Project> {
    const areas = [
      ...new Map(input.areas.map((area) => [area.id, area])).values(),
    ];

    if (
      areas.length === 0 ||
      !areas.every(isArea) ||
      !areas.some((area) => area.id === input.projectAreaId)
    ) {
      throw new Error("Onboarding requires valid Areas for the first Project.");
    }

    const project = createProject({
      areaId: input.projectAreaId,
      createdAt: new Date(),
      energyLevel: input.projectEnergyLevel,
      id: this.createId(),
      initialNextAction: {
        id: this.createId(),
        title: input.projectNextAction,
      },
      outcome: input.projectOutcome,
      title: input.projectTitle,
    });
    const items = await this.itemRepository.get();

    // Areas are persisted first because every Project and Task references one.
    await this.areaRepository.save(areas);
    await this.itemRepository.save([
      project,
      ...items.filter((stored) => stored.id !== project.id),
    ]);
    return project;
  }

  async getProjects(): Promise<readonly Project[]> {
    return (await this.itemRepository.get()).filter(isProject);
  }

  async loadOverview(
    filters: ProjectFilters = {},
  ): Promise<ProjectOverviewData> {
    const [items, areas] = await Promise.all([
      this.itemRepository.get(),
      this.areaRepository.get(),
    ]);
    const overviews = items
      .filter(isProject)
      .map((project) => buildProjectOverview(project, items, areas));

    return { areas, projects: filterProjectOverviews(overviews, filters) };
  }

  async loadProject(projectId: string): Promise<ProjectDetailData | null> {
    const [items, areas] = await Promise.all([
      this.itemRepository.get(),
      this.areaRepository.get(),
    ]);
    const projects = items.filter(isProject);
    const project = projects.find((candidate) => candidate.id === projectId);

    return project
      ? {
          areas,
          detail: buildProjectDetail(project, items, areas),
          projects,
        }
      : null;
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
      const task = createTask({
        ...input,
        attentionScore: 50,
        createdAt: now,
        effort: input.energyCost,
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
    const updatedTask = reviseTask(
      task,
      {
        ...input,
        attentionScore: task.attentionScore,
        effort: task.effort,
        scheduledEnd: task.scheduledEnd,
        scheduledStart: task.scheduledStart,
        tags: task.tags,
      },
      now,
    );
    const nextItems =
      task.projectId === updatedTask.projectId
        ? replaceTaskInItems(items, updatedTask, now)
        : insertTaskIntoItems(
            removeTaskFromItems(items, taskId, now).items,
            updatedTask,
            now,
          );

    await this.itemRepository.save(nextItems);
    return updatedTask;
  }

  async deleteTask(taskId: string): Promise<void> {
    const items = await this.itemRepository.get();
    const result = removeTaskFromItems(items, taskId);
    if (!result.task) throw new Error("The Task no longer exists.");
    await this.itemRepository.save(result.items);
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
    if (!areas.some((area) => area.id === input.areaId)) {
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

export { ProjectService };
