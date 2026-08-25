import {
  buildProjectDetail,
  buildProjectOverview,
  appendProjectArtifact,
  createProject,
  createProjectMilestone,
  createProjectNote,
  createProjectRelation,
  filterProjectOverviews,
  getRelationTarget,
  groupProjectTask,
  isArea,
  isProject,
  isProjectMilestone,
  isProjectNote,
  isProjectRelation,
  removeProjectArtifact,
  replaceProjectArtifact,
  setProjectMilestoneCompleted,
  setProjectNotePinned,
  type Item,
  type Project,
  type ProjectFilters,
  type ProjectMilestone,
  type ProjectNote,
  type Task,
} from "../domain";
import type {
  CompleteOnboardingInput,
  ProjectDetailData,
  ProjectFeature,
  ProjectMilestoneInput,
  ProjectOverviewData,
  TaskWriteInput,
} from "@/features/contracts/ProjectFeature";
import { TaskService } from "./TaskService";
import type { AreaRepository } from "../repositories/AreaRepository";
import type { ItemRepository } from "../repositories/ItemRepository";

type IdGenerator = () => string;

function containsId(items: readonly Item[], id: string): boolean {
  return items.some((item) => item.id === id || containsId(item.children, id));
}

function findProject(items: readonly Item[], projectId: string): Project {
  const project = items.find(
    (item): item is Project => isProject(item) && item.id === projectId,
  );
  if (!project) throw new Error("The Project no longer exists.");
  return project;
}

/** Application boundary for Project workspaces and Task commands. */
class ProjectService implements ProjectFeature {
  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly areaRepository: AreaRepository,
    private readonly createId: IdGenerator,
    private readonly taskService = new TaskService(
      itemRepository,
      areaRepository,
      createId,
    ),
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

  async createMilestone(
    projectId: string,
    input: ProjectMilestoneInput,
  ): Promise<ProjectMilestone> {
    const items = await this.itemRepository.get();
    const project = findProject(items, projectId);
    const now = new Date();
    const milestone = createProjectMilestone(project, {
      ...input,
      id: this.createUniqueId(items),
    }, now);
    await this.itemRepository.save(
      appendProjectArtifact(items, projectId, milestone, now),
    );
    return milestone;
  }

  async setMilestoneCompleted(
    projectId: string,
    milestoneId: string,
    completed: boolean,
  ): Promise<void> {
    const items = await this.itemRepository.get();
    const project = findProject(items, projectId);
    const milestone = project.children.find(
      (item): item is ProjectMilestone =>
        item.id === milestoneId && isProjectMilestone(item),
    );
    if (!milestone) throw new Error("The Milestone no longer exists.");
    const now = new Date();
    await this.itemRepository.save(replaceProjectArtifact(
      items,
      projectId,
      setProjectMilestoneCompleted(milestone, completed, now),
      now,
    ));
  }

  async deleteMilestone(projectId: string, milestoneId: string): Promise<void> {
    const items = await this.itemRepository.get();
    const project = findProject(items, projectId);
    if (!project.children.some((item) => item.id === milestoneId && isProjectMilestone(item))) {
      throw new Error("The Milestone no longer exists.");
    }
    await this.itemRepository.save(
      removeProjectArtifact(items, projectId, milestoneId),
    );
  }

  async createNote(
    projectId: string,
    body: string,
    pinned: boolean,
  ): Promise<ProjectNote> {
    const items = await this.itemRepository.get();
    const project = findProject(items, projectId);
    const now = new Date();
    const note = createProjectNote(
      project,
      this.createUniqueId(items),
      body,
      pinned,
      now,
    );
    await this.itemRepository.save(
      appendProjectArtifact(items, projectId, note, now),
    );
    return note;
  }

  async setNotePinned(
    projectId: string,
    noteId: string,
    pinned: boolean,
  ): Promise<void> {
    const items = await this.itemRepository.get();
    const project = findProject(items, projectId);
    const note = project.children.find(
      (item): item is ProjectNote => item.id === noteId && isProjectNote(item),
    );
    if (!note) throw new Error("The Project note no longer exists.");
    const now = new Date();
    await this.itemRepository.save(replaceProjectArtifact(
      items,
      projectId,
      setProjectNotePinned(note, pinned, now),
      now,
    ));
  }

  async deleteNote(projectId: string, noteId: string): Promise<void> {
    const items = await this.itemRepository.get();
    const project = findProject(items, projectId);
    if (!project.children.some((item) => item.id === noteId && isProjectNote(item))) {
      throw new Error("The Project note no longer exists.");
    }
    await this.itemRepository.save(removeProjectArtifact(items, projectId, noteId));
  }

  async linkRelatedProject(
    projectId: string,
    relatedProjectId: string,
  ): Promise<void> {
    let items = await this.itemRepository.get();
    const project = findProject(items, projectId);
    const related = findProject(items, relatedProjectId);
    if (project.id === related.id) throw new Error("A Project cannot relate to itself.");
    const forwardExists = project.children.some(
      (item) => isProjectRelation(item) && getRelationTarget(item) === related.id,
    );
    const reverseExists = related.children.some(
      (item) => isProjectRelation(item) && getRelationTarget(item) === project.id,
    );
    if (forwardExists && reverseExists) return;
    const now = new Date();
    if (!forwardExists) {
      const forward = createProjectRelation(
        project,
        related,
        this.createUniqueId(items),
        now,
      );
      items = appendProjectArtifact(items, project.id, forward, now);
    }
    if (!reverseExists) {
      const reverse = createProjectRelation(
        related,
        project,
        this.createUniqueId(items),
        now,
      );
      items = appendProjectArtifact(items, related.id, reverse, now);
    }
    await this.itemRepository.save(items);
  }

  async unlinkRelatedProject(
    projectId: string,
    relatedProjectId: string,
  ): Promise<void> {
    let items = await this.itemRepository.get();
    const project = findProject(items, projectId);
    const related = findProject(items, relatedProjectId);
    const forward = project.children.find(
      (item) => isProjectRelation(item) && getRelationTarget(item) === related.id,
    );
    const reverse = related.children.find(
      (item) => isProjectRelation(item) && getRelationTarget(item) === project.id,
    );
    if (forward) items = removeProjectArtifact(items, project.id, forward.id);
    if (reverse) items = removeProjectArtifact(items, related.id, reverse.id);
    await this.itemRepository.save(items);
  }

  async groupTask(
    projectId: string,
    taskId: string,
    milestoneId: string | null,
  ): Promise<void> {
    const items = await this.itemRepository.get();
    await this.itemRepository.save(
      groupProjectTask(items, projectId, taskId, milestoneId),
    );
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
    return this.taskService.createTask(input);
  }

  async createTasks(inputs: readonly TaskWriteInput[]): Promise<readonly Task[]> {
    return this.taskService.createTasks(inputs);
  }

  async updateTask(taskId: string, input: TaskWriteInput): Promise<Task> {
    return this.taskService.updateTask(taskId, input);
  }

  async deleteTask(taskId: string): Promise<void> {
    return this.taskService.deleteTask(taskId);
  }

  async reorderTask(
    projectId: string,
    taskId: string,
    direction: "down" | "up",
  ): Promise<void> {
    return this.taskService.reorderTask(projectId, taskId, direction);
  }

  private createUniqueId(items: readonly Item[]): string {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const id = this.createId();
      if (!containsId(items, id)) return id;
    }
    throw new Error("Atlas could not create a unique Item id.");
  }
}

export { ProjectService };
