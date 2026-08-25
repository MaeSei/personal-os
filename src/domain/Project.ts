import type { AreaId } from "./Area";
import type { AttentionScore, EnergyCost } from "./Attention";
import { ItemType, type Item, type ItemId } from "./Item";
import { Status } from "./Status";
import { createTask } from "./Task";

type ProjectStatus =
  | Status.Active
  | Status.Waiting
  | Status.Blocked
  | Status.Someday
  | Status.Completed
  | Status.Archived;

type Project = Item & {
  readonly areaId: AreaId;
  readonly attentionScore: AttentionScore;
  readonly energyLevel: EnergyCost;
  readonly outcome: string;
  readonly status: ProjectStatus;
  readonly type: ItemType.Project;
};

type CreateProjectInput = {
  readonly areaId: AreaId;
  readonly attentionScore?: AttentionScore;
  readonly createdAt: Date;
  readonly description?: string | null;
  readonly energyLevel: EnergyCost;
  readonly id: ItemId;
  readonly initialNextAction?: {
    readonly id: ItemId;
    readonly title: string;
  };
  readonly outcome: string;
  readonly title: string;
};

const projectStatuses: readonly ProjectStatus[] = [
  Status.Active,
  Status.Waiting,
  Status.Blocked,
  Status.Someday,
  Status.Completed,
  Status.Archived,
];

function clampAttentionScore(value: number): AttentionScore {
  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.min(Math.max(value, 0), 100);
}

function isEnergyLevel(value: number): value is EnergyCost {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function isProjectStatus(status: Status): status is ProjectStatus {
  return projectStatuses.includes(status as ProjectStatus);
}

/** Creates a Project container; its children are the work Atlas can execute. */
function createProject(input: CreateProjectInput): Project {
  const areaId = input.areaId.trim();
  const id = input.id.trim();
  const nextActionId = input.initialNextAction?.id.trim() ?? "";
  const nextActionTitle = input.initialNextAction?.title.trim() ?? "";
  const outcome = input.outcome.trim();
  const title = input.title.trim();

  if (
    !areaId ||
    !id ||
    !title ||
    !outcome ||
    (input.initialNextAction !== undefined &&
      (!nextActionId || !nextActionTitle))
  ) {
    throw new Error(
      "A Project requires an outcome, title, id, and Area.",
    );
  }

  if (nextActionId && id === nextActionId) {
    throw new Error("A Project and its next action require different ids.");
  }

  if (!isEnergyLevel(input.energyLevel)) {
    throw new Error("A Project energy level must be between 1 and 5.");
  }

  const createdAt = new Date(input.createdAt.getTime());
  const attentionScore = clampAttentionScore(input.attentionScore ?? 50);
  const nextAction = input.initialNextAction
    ? createTask({
        areaId,
        attentionScore,
        createdAt,
        effort: input.energyLevel,
        energyCost: input.energyLevel,
        id: nextActionId,
        projectId: id,
        status: Status.Today,
        title: nextActionTitle,
      })
    : null;

  return {
    areaId,
    attentionScore,
    children: nextAction ? [nextAction] : [],
    createdAt,
    description:
      input.description === undefined
        ? outcome
        : input.description?.trim() || null,
    effort: input.energyLevel,
    energyCost: input.energyLevel,
    energyLevel: input.energyLevel,
    id,
    outcome,
    parentId: null,
    projectId: null,
    status: Status.Active,
    tags: [],
    title,
    type: ItemType.Project,
    updatedAt: new Date(createdAt.getTime()),
  };
}

function isProject(item: Item): item is Project {
  const project = item as Partial<Project>;

  return (
    item.type === ItemType.Project &&
    item.areaId !== null &&
    item.parentId === null &&
    typeof project.outcome === "string" &&
    project.outcome.trim().length > 0 &&
    typeof project.energyLevel === "number" &&
    isEnergyLevel(project.energyLevel) &&
    isProjectStatus(item.status)
  );
}

function containsItem(items: readonly Item[], itemId: ItemId): boolean {
  return items.some(
    (item) => item.id === itemId || containsItem(item.children, itemId),
  );
}

/** Resolves the outcome that gives an action its reason for existing. */
function getProjectForItem(
  item: Pick<Item, "id" | "parentId" | "projectId">,
  projects: readonly Project[],
): Project | null {
  if (item.projectId) {
    return projects.find((project) => project.id === item.projectId) ?? null;
  }

  return (
    projects.find(
      (project) =>
        item.parentId === project.id ||
        containsItem(project.children, item.id),
    ) ?? null
  );
}

export {
  createProject,
  getProjectForItem,
  isProject,
  isProjectStatus,
  projectStatuses,
};
export type { CreateProjectInput, Project, ProjectStatus };
