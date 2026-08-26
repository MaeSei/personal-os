import type { ItemId } from "./Item";
import type { Task } from "./Task";

const DEPENDENCY_TAG_PREFIX = "atlas:depends-on:";

function dependencyTags(ids: readonly ItemId[]): readonly string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
    .map((id) => `${DEPENDENCY_TAG_PREFIX}${id}`);
}

function getTaskDependencyIds(task: Pick<Task, "tags">): readonly ItemId[] {
  return task.tags
    .filter((tag) => tag.startsWith(DEPENDENCY_TAG_PREFIX))
    .map((tag) => tag.slice(DEPENDENCY_TAG_PREFIX.length))
    .filter(Boolean);
}

export { DEPENDENCY_TAG_PREFIX, dependencyTags, getTaskDependencyIds };
