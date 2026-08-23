import type { AreaId } from "./Area";
import type { AttentionScore, EnergyCost } from "./Attention";
import { ItemType, type Item, type ItemId } from "./Item";
import { Status } from "./Status";

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
  readonly energyLevel: EnergyCost;
  readonly id: ItemId;
  readonly initialNextAction: {
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
  const nextActionId = input.initialNextAction.id.trim();
  const nextActionTitle = input.initialNextAction.title.trim();
  const outcome = input.outcome.trim();
  const title = input.title.trim();

  if (
    !areaId ||
    !id ||
    !nextActionId ||
    !nextActionTitle ||
    !title ||
    !outcome
  ) {
    throw new Error(
      "A Project requires an outcome, title, first next action, id, and Area.",
    );
  }

  if (id === nextActionId) {
    throw new Error("A Project and its next action require different ids.");
  }

  if (!isEnergyLevel(input.energyLevel)) {
    throw new Error("A Project energy level must be between 1 and 5.");
  }

  const createdAt = new Date(input.createdAt.getTime());
  const attentionScore = clampAttentionScore(input.attentionScore ?? 50);
  const nextAction: Item = {
    areaId,
    attentionScore,
    children: [],
    createdAt: new Date(createdAt.getTime()),
    description: null,
    effort: input.energyLevel,
    energyCost: input.energyLevel,
    id: nextActionId,
    parentId: id,
    status: Status.Today,
    tags: [],
    title: nextActionTitle,
    type: ItemType.Task,
    updatedAt: new Date(createdAt.getTime()),
  };

  return {
    areaId,
    attentionScore,
    children: [nextAction],
    createdAt,
    description: outcome,
    effort: input.energyLevel,
    energyCost: input.energyLevel,
    energyLevel: input.energyLevel,
    id,
    outcome,
    parentId: null,
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
  item: Pick<Item, "id" | "parentId">,
  projects: readonly Project[],
): Project | null {
  return (
    projects.find(
      (project) =>
        item.parentId === project.id || containsItem(project.children, item.id),
    ) ?? null
  );
}

export { createProject, getProjectForItem, isProject, isProjectStatus };
export type { CreateProjectInput, Project, ProjectStatus };
