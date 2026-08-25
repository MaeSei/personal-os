import type { Item, ItemId } from "./Item";
import { isProject, type Project } from "./Project";
import { getProjectTaskRoots } from "./ProjectWorkspace";
import { isTask, type Task } from "./Task";

type TaskRemovalResult = {
  readonly items: readonly Item[];
  readonly task: Task | null;
};

function findTask(items: readonly Item[], taskId: ItemId): Task | null {
  for (const item of items) {
    if (item.id === taskId && isTask(item)) return item;
    const nested = findTask(item.children, taskId);
    if (nested) return nested;
  }
  return null;
}

function removeIds(
  items: readonly Item[],
  ids: ReadonlySet<ItemId>,
  updatedAt: Date,
): readonly Item[] {
  return items.flatMap((item) => {
    if (ids.has(item.id)) return [];
    const children = removeIds(item.children, ids, updatedAt);
    const changed =
      children.length !== item.children.length ||
      children.some((child, index) => child !== item.children[index]);
    return changed
      ? [{ ...item, children, updatedAt: new Date(updatedAt.getTime()) }]
      : [item];
  });
}

function removeTaskFromItems(
  items: readonly Item[],
  taskId: ItemId,
  updatedAt: Date = new Date(),
): TaskRemovalResult {
  const task = findTask(items, taskId);
  return task
    ? { items: removeIds(items, new Set([taskId]), updatedAt), task }
    : { items, task: null };
}

function replaceTaskInItems(
  items: readonly Item[],
  replacement: Task,
  updatedAt: Date = new Date(),
): readonly Item[] {
  let replaced = false;

  function visit(current: readonly Item[]): readonly Item[] {
    return current.flatMap((item) => {
      if (item.id === replacement.id && isTask(item)) {
        if (replaced) return [];
        replaced = true;
        return [replacement];
      }

      const children = visit(item.children);
      const changed =
        children.length !== item.children.length ||
        children.some((child, index) => child !== item.children[index]);
      return changed
        ? [{ ...item, children, updatedAt: new Date(updatedAt.getTime()) }]
        : [item];
    });
  }

  const nextItems = visit(items);
  if (!replaced) throw new Error("The Task no longer exists.");
  return nextItems;
}

function insertTaskIntoItems(
  items: readonly Item[],
  task: Task,
  updatedAt: Date = new Date(),
): readonly Item[] {
  if (task.projectId === null) return [...items, task];

  let inserted = false;

  function visit(current: readonly Item[]): readonly Item[] {
    return current.map((item) => {
      if (isProject(item) && item.id === task.projectId) {
        inserted = true;
        return {
          ...item,
          children: [...item.children, task],
          updatedAt: new Date(updatedAt.getTime()),
        };
      }

      const children = visit(item.children);
      return children.some((child, index) => child !== item.children[index])
        ? { ...item, children, updatedAt: new Date(updatedAt.getTime()) }
        : item;
    });
  }

  const nextItems = visit(items);
  if (!inserted) throw new Error("The selected Project no longer exists.");
  return nextItems;
}

function reorderProjectTasks(
  items: readonly Item[],
  projectId: ItemId,
  taskId: ItemId,
  direction: "down" | "up",
  updatedAt: Date = new Date(),
): readonly Item[] {
  const project = items.find(
    (item): item is Project => isProject(item) && item.id === projectId,
  );
  if (!project) throw new Error("The Project no longer exists.");

  function reorderWithin(item: Item): { found: boolean; item: Item } {
    const taskPositions = item.children.flatMap((child, index) =>
      isTask(child) ? [index] : [],
    );
    const childIndex = item.children.findIndex(
      (child) => child.id === taskId && isTask(child),
    );

    if (childIndex >= 0) {
      const taskIndex = taskPositions.indexOf(childIndex);
      const nextTaskIndex = direction === "up" ? taskIndex - 1 : taskIndex + 1;
      if (nextTaskIndex < 0 || nextTaskIndex >= taskPositions.length) {
        return { found: true, item };
      }

      const nextChildren = [...item.children];
      const nextChildIndex = taskPositions[nextTaskIndex];
      [nextChildren[childIndex], nextChildren[nextChildIndex]] = [
        nextChildren[nextChildIndex],
        nextChildren[childIndex],
      ];
      return {
        found: true,
        item: {
          ...item,
          children: nextChildren,
          updatedAt: new Date(updatedAt.getTime()),
        },
      };
    }

    for (let index = 0; index < item.children.length; index += 1) {
      const child = item.children[index];
      const result = reorderWithin(child);
      if (result.found) {
        const nextChildren = [...item.children];
        nextChildren[index] = result.item;
        return {
          found: true,
          item: {
            ...item,
            children: nextChildren,
            updatedAt: new Date(updatedAt.getTime()),
          },
        };
      }
    }

    return { found: false, item };
  }

  const nestedResult = reorderWithin(project);
  if (nestedResult.found) {
    return items.map((item) =>
      item.id === project.id ? nestedResult.item : item,
    );
  }

  const roots = [...getProjectTaskRoots(project, items)];
  const index = roots.findIndex((task) => task.id === taskId);
  const nextIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0) throw new Error("Only a Project's root Tasks can be reordered.");
  if (nextIndex < 0 || nextIndex >= roots.length) return items;

  [roots[index], roots[nextIndex]] = [roots[nextIndex], roots[index]];
  const rootIds = new Set(roots.map((task) => task.id));
  const stripped = removeIds(items, rootIds, updatedAt);

  return stripped.map((item) =>
    isProject(item) && item.id === projectId
      ? {
          ...item,
          children: roots.map((task) => ({
            ...task,
            parentId: projectId,
            projectId,
          })),
          updatedAt: new Date(updatedAt.getTime()),
        }
      : item,
  );
}

export {
  findTask,
  insertTaskIntoItems,
  removeTaskFromItems,
  reorderProjectTasks,
  replaceTaskInItems,
};
export type { TaskRemovalResult };
