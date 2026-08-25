import type { AreaId } from "./Area";
import type { CalendarDate, Item, ItemId } from "./Item";
import { ItemType } from "./Item";
import type { Project } from "./Project";
import { isProject } from "./Project";
import { Status } from "./Status";
import { isTask, type Task } from "./Task";
import { removeTaskFromItems } from "./TaskTree";

const MILESTONE_TAG = "atlas:project-milestone";
const NOTE_TAG = "atlas:project-note";
const PINNED_TAG = "atlas:pinned";
const RELATION_TAG = "atlas:related-project";
const RELATION_TARGET_PREFIX = "atlas:related-project:";

type ProjectMilestone = Item & {
  readonly areaId: AreaId;
  readonly dueDate: CalendarDate | null;
  readonly projectId: ItemId;
  readonly status: Status.Active | Status.Completed;
  readonly type: ItemType.Workflow;
};

type ProjectNote = Item & {
  readonly areaId: AreaId;
  readonly description: string;
  readonly projectId: ItemId;
  readonly status: Status.Active;
  readonly type: ItemType.Reference;
};

type ProjectRelation = Item & {
  readonly areaId: AreaId;
  readonly description: ItemId;
  readonly projectId: ItemId;
  readonly status: Status.Active;
  readonly type: ItemType.Reference;
};

type ProjectTaskGroup = {
  readonly milestone: ProjectMilestone | null;
  readonly tasks: readonly Task[];
};

function normalizeCalendarDate(value?: CalendarDate | null): CalendarDate | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) throw new Error("A Milestone date must use YYYY-MM-DD.");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.toISOString().slice(0, 10) !== value.trim()) {
    throw new Error("A Milestone requires a valid calendar day.");
  }
  return value.trim();
}

function artifactBase(
  project: Project,
  id: ItemId,
  title: string,
  type: ItemType.Reference | ItemType.Workflow,
  tags: readonly string[],
  createdAt: Date,
): Item {
  const normalizedId = id.trim();
  const normalizedTitle = title.trim();
  if (!normalizedId || !normalizedTitle) {
    throw new Error("Project context requires an id and title.");
  }
  return {
    areaId: project.areaId,
    attentionScore: 0,
    children: [],
    createdAt: new Date(createdAt.getTime()),
    description: null,
    effort: 1,
    energyCost: 1,
    id: normalizedId,
    parentId: project.id,
    projectId: project.id,
    status: Status.Active,
    tags: [...tags],
    title: normalizedTitle,
    type,
    updatedAt: new Date(createdAt.getTime()),
  };
}

function createProjectMilestone(
  project: Project,
  input: {
    readonly description?: string | null;
    readonly dueDate?: CalendarDate | null;
    readonly id: ItemId;
    readonly title: string;
  },
  createdAt: Date = new Date(),
): ProjectMilestone {
  return {
    ...artifactBase(project, input.id, input.title, ItemType.Workflow, [MILESTONE_TAG], createdAt),
    areaId: project.areaId,
    description: input.description?.trim() || null,
    dueDate: normalizeCalendarDate(input.dueDate),
    projectId: project.id,
    status: Status.Active,
    type: ItemType.Workflow,
  };
}

function createProjectNote(
  project: Project,
  id: ItemId,
  body: string,
  pinned: boolean,
  createdAt: Date = new Date(),
): ProjectNote {
  const normalized = body.trim();
  if (!normalized) throw new Error("A Project note cannot be empty.");
  const title = normalized.split("\n")[0].slice(0, 80);
  return {
    ...artifactBase(project, id, title, ItemType.Reference, [
      NOTE_TAG,
      ...(pinned ? [PINNED_TAG] : []),
    ], createdAt),
    areaId: project.areaId,
    description: normalized,
    projectId: project.id,
    status: Status.Active,
    type: ItemType.Reference,
  };
}

function createProjectRelation(
  project: Project,
  related: Project,
  id: ItemId,
  createdAt: Date = new Date(),
): ProjectRelation {
  if (project.id === related.id) throw new Error("A Project cannot relate to itself.");
  return {
    ...artifactBase(project, id, related.title, ItemType.Reference, [
      RELATION_TAG,
      `${RELATION_TARGET_PREFIX}${related.id}`,
    ], createdAt),
    areaId: project.areaId,
    description: related.id,
    projectId: project.id,
    status: Status.Active,
    type: ItemType.Reference,
  };
}

function isTagged(item: Item, tag: string): boolean {
  return item.tags.includes(tag);
}

function isProjectMilestone(item: Item): item is ProjectMilestone {
  return item.type === ItemType.Workflow && typeof item.projectId === "string" &&
    item.projectId.trim().length > 0 &&
    item.areaId !== null && isTagged(item, MILESTONE_TAG) &&
    [Status.Active, Status.Completed].includes(item.status);
}

function isProjectNote(item: Item): item is ProjectNote {
  return item.type === ItemType.Reference && typeof item.projectId === "string" &&
    item.projectId.trim().length > 0 &&
    item.areaId !== null && typeof item.description === "string" &&
    item.description.trim().length > 0 && isTagged(item, NOTE_TAG);
}

function isProjectRelation(item: Item): item is ProjectRelation {
  return item.type === ItemType.Reference && typeof item.projectId === "string" &&
    item.projectId.trim().length > 0 &&
    item.areaId !== null && typeof item.description === "string" &&
    isTagged(item, RELATION_TAG) && item.tags.some((tag) => tag.startsWith(RELATION_TARGET_PREFIX));
}

function isProjectNotePinned(note: ProjectNote): boolean {
  return isTagged(note, PINNED_TAG);
}

function setProjectMilestoneCompleted(
  milestone: ProjectMilestone,
  completed: boolean,
  updatedAt: Date = new Date(),
): ProjectMilestone {
  return {
    ...milestone,
    status: completed ? Status.Completed : Status.Active,
    updatedAt: new Date(updatedAt.getTime()),
  };
}

function setProjectNotePinned(
  note: ProjectNote,
  pinned: boolean,
  updatedAt: Date = new Date(),
): ProjectNote {
  return {
    ...note,
    tags: pinned
      ? [...new Set([...note.tags, PINNED_TAG])]
      : note.tags.filter((tag) => tag !== PINNED_TAG),
    updatedAt: new Date(updatedAt.getTime()),
  };
}

function getRelationTarget(relation: ProjectRelation): ItemId {
  return relation.tags.find((tag) => tag.startsWith(RELATION_TARGET_PREFIX))
    ?.slice(RELATION_TARGET_PREFIX.length) ?? relation.description;
}

function flatten(items: readonly Item[]): readonly Item[] {
  return items.flatMap((item) => [item, ...flatten(item.children)]);
}

function getProjectTaskGroups(project: Project, items: readonly Item[]): readonly ProjectTaskGroup[] {
  const milestones = project.children.filter(isProjectMilestone);
  const groupedIds = new Set(milestones.flatMap((milestone) =>
    flatten(milestone.children).filter(isTask).map((task) => task.id)));
  const direct = project.children.filter(isTask);
  const containedIds = new Set(flatten(project.children).filter(isTask).map((task) => task.id));
  const legacy = flatten(items).filter((item): item is Task =>
    isTask(item) && item.projectId === project.id && !containedIds.has(item.id));
  return [
    { milestone: null, tasks: [...direct, ...legacy].filter((task) => !groupedIds.has(task.id)) },
    ...milestones.map((milestone) => ({
      milestone,
      tasks: milestone.children.filter(isTask),
    })),
  ];
}

function getProjectArtifacts(project: Project, projects: readonly Project[]) {
  const milestones = project.children.filter(isProjectMilestone);
  const notes = project.children.filter(isProjectNote).sort((left, right) =>
    Number(isProjectNotePinned(right)) - Number(isProjectNotePinned(left)) ||
    right.updatedAt.getTime() - left.updatedAt.getTime());
  const targetIds = new Set(project.children.filter(isProjectRelation).map(getRelationTarget));
  return {
    milestones,
    notes,
    relatedProjects: projects.filter((candidate) => targetIds.has(candidate.id)),
  };
}

function updateProject(
  items: readonly Item[],
  projectId: ItemId,
  change: (project: Project) => Project,
): readonly Item[] {
  let found = false;
  const next = items.map((item) => {
    if (!isProject(item) || item.id !== projectId) return item;
    found = true;
    return change(item);
  });
  if (!found) throw new Error("The Project no longer exists.");
  return next;
}

function appendProjectArtifact(
  items: readonly Item[],
  projectId: ItemId,
  artifact: Item,
  updatedAt: Date = new Date(),
): readonly Item[] {
  return updateProject(items, projectId, (project) => ({
    ...project,
    children: [...project.children, artifact],
    updatedAt: new Date(updatedAt.getTime()),
  }));
}

function replaceProjectArtifact(
  items: readonly Item[],
  projectId: ItemId,
  artifact: Item,
  updatedAt: Date = new Date(),
): readonly Item[] {
  return updateProject(items, projectId, (project) => {
    if (!project.children.some((child) => child.id === artifact.id)) {
      throw new Error("The Project context no longer exists.");
    }
    return {
      ...project,
      children: project.children.map((child) => child.id === artifact.id ? artifact : child),
      updatedAt: new Date(updatedAt.getTime()),
    };
  });
}

function removeProjectArtifact(
  items: readonly Item[],
  projectId: ItemId,
  artifactId: ItemId,
  updatedAt: Date = new Date(),
): readonly Item[] {
  return updateProject(items, projectId, (project) => {
    const artifact = project.children.find((child) => child.id === artifactId);
    if (!artifact) throw new Error("The Project context no longer exists.");
    const promoted = isProjectMilestone(artifact)
      ? artifact.children.map((child) => ({ ...child, parentId: projectId }))
      : [];
    return {
      ...project,
      children: project.children.flatMap((child) => child.id === artifactId ? promoted : [child]),
      updatedAt: new Date(updatedAt.getTime()),
    };
  });
}

function groupProjectTask(
  items: readonly Item[],
  projectId: ItemId,
  taskId: ItemId,
  milestoneId: ItemId | null,
  updatedAt: Date = new Date(),
): readonly Item[] {
  const project = items.find((item): item is Project => isProject(item) && item.id === projectId);
  if (!project) throw new Error("The Project no longer exists.");
  if (milestoneId && !project.children.some((item) => item.id === milestoneId && isProjectMilestone(item))) {
    throw new Error("The selected Milestone no longer exists.");
  }
  const removal = removeTaskFromItems(items, taskId, updatedAt);
  if (!removal.task || removal.task.projectId !== projectId) {
    throw new Error("Only this Project's Tasks can be grouped.");
  }
  const task: Task = {
    ...removal.task,
    areaId: project.areaId,
    parentId: milestoneId ?? projectId,
    projectId,
    updatedAt: new Date(updatedAt.getTime()),
  };
  return updateProject(removal.items, projectId, (current) => ({
    ...current,
    children: milestoneId
      ? current.children.map((child) => child.id === milestoneId
        ? { ...child, children: [...child.children, task], updatedAt: new Date(updatedAt.getTime()) }
        : child)
      : [...current.children, task],
    updatedAt: new Date(updatedAt.getTime()),
  }));
}

export {
  appendProjectArtifact,
  createProjectMilestone,
  createProjectNote,
  createProjectRelation,
  getProjectArtifacts,
  getProjectTaskGroups,
  getRelationTarget,
  groupProjectTask,
  isProjectMilestone,
  isProjectNote,
  isProjectNotePinned,
  isProjectRelation,
  removeProjectArtifact,
  replaceProjectArtifact,
  setProjectMilestoneCompleted,
  setProjectNotePinned,
};
export type { ProjectMilestone, ProjectNote, ProjectRelation, ProjectTaskGroup };
