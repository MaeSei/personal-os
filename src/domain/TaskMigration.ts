import { ItemType, type Item, type ItemId } from "./Item";

const LEGACY_TASK_FALLBACK_AREA_ID = "personal";

type ProjectReference = {
  readonly areaId: string;
  readonly id: ItemId;
};

type TaskMigrationResult = {
  readonly changed: boolean;
  readonly items: readonly Item[];
};

function collectProjects(items: readonly Item[]): Map<ItemId, ProjectReference> {
  const projects = new Map<ItemId, ProjectReference>();

  function visit(item: Item) {
    if (item.type === ItemType.Project && item.areaId !== null) {
      projects.set(item.id, { areaId: item.areaId, id: item.id });
    }

    item.children.forEach(visit);
  }

  items.forEach(visit);
  return projects;
}

/**
 * Upgrades stored Tasks without changing valid assignments. Missing Areas are
 * inherited from a linked/containing Project, then fall back to Personal.
 */
function migrateLegacyTasks(items: readonly Item[]): TaskMigrationResult {
  const projects = collectProjects(items);

  function migrateItem(
    item: Item,
    containingProject: ProjectReference | null,
  ): { changed: boolean; item: Item } {
    const currentProject =
      item.type === ItemType.Project && item.areaId !== null
        ? projects.get(item.id) ?? null
        : containingProject;
    const migratedChildren = item.children.map((child) =>
      migrateItem(child, currentProject),
    );
    const childrenChanged = migratedChildren.some((child) => child.changed);
    const children = childrenChanged
      ? migratedChildren.map((child) => child.item)
      : item.children;

    if (item.type !== ItemType.Task) {
      return childrenChanged
        ? { changed: true, item: { ...item, children } }
        : { changed: false, item };
    }

    const explicitProject =
      typeof item.projectId === "string"
        ? projects.get(item.projectId) ?? null
        : null;
    const parentProject =
      item.parentId !== null ? projects.get(item.parentId) ?? null : null;
    const project = explicitProject ?? parentProject ?? containingProject;
    const projectId = project?.id ?? null;
    const areaId = item.areaId?.trim()
      ? item.areaId
      : project?.areaId ?? LEGACY_TASK_FALLBACK_AREA_ID;
    const parentId = item.parentId ?? projectId;
    const changed =
      childrenChanged ||
      item.areaId !== areaId ||
      item.parentId !== parentId ||
      item.projectId !== projectId;

    return changed
      ? {
          changed: true,
          item: { ...item, areaId, children, parentId, projectId },
        }
      : { changed: false, item };
  }

  const migrated = items.map((item) => migrateItem(item, null));

  return {
    changed: migrated.some((item) => item.changed),
    items: migrated.map((item) => item.item),
  };
}

export { LEGACY_TASK_FALLBACK_AREA_ID, migrateLegacyTasks };
export type { TaskMigrationResult };
