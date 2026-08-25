import type { AreaId } from "./Area";
import type { Item, ItemId } from "./Item";
import { createProject, type Project, type ProjectStatus } from "./Project";
import { Status } from "./Status";
import { isTask } from "./Task";
import { removeTaskFromItems } from "./TaskTree";

type TaskConversionResult = {
  readonly items: readonly Item[];
  readonly project: Project | null;
};

function toProjectStatus(status: Status): ProjectStatus {
  return status === Status.Today ? Status.Active : status as ProjectStatus;
}

function rehomeChildren(
  children: readonly Item[],
  areaId: AreaId,
  parentId: ItemId,
  projectId: ItemId,
  updatedAt: Date,
): readonly Item[] {
  return children.map((child) => {
    const next = isTask(child)
      ? { ...child, areaId, parentId, projectId }
      : { ...child, parentId };

    return {
      ...next,
      children: rehomeChildren(
        child.children,
        areaId,
        child.id,
        projectId,
        updatedAt,
      ),
      updatedAt: new Date(updatedAt.getTime()),
    };
  });
}

/** Replaces one Task with a new root Project and preserves any child work. */
function convertTaskToProject(
  items: readonly Item[],
  taskId: ItemId,
  projectId: ItemId,
  outcome: string,
  convertedAt: Date = new Date(),
): TaskConversionResult {
  const removal = removeTaskFromItems(items, taskId, convertedAt);
  const task = removal.task;

  if (!task) return { items, project: null };

  const base = createProject({
    areaId: task.areaId,
    attentionScore: task.attentionScore,
    createdAt: task.createdAt,
    description: task.description,
    energyLevel: task.energyCost,
    id: projectId,
    outcome,
    title: task.title,
  });
  const project: Project = {
    ...base,
    children: rehomeChildren(
      task.children,
      task.areaId,
      projectId,
      projectId,
      convertedAt,
    ),
    status: toProjectStatus(task.status),
    tags: [...task.tags],
    updatedAt: new Date(convertedAt.getTime()),
  };

  return { items: [...removal.items, project], project };
}

export { convertTaskToProject };
export type { TaskConversionResult };
