import {
  isActionable,
  type ActionableItem,
  type ActionItemType,
} from "./Focus";
import { ItemType, type Item } from "./Item";
import { getProjectForItem, isProject, type Project } from "./Project";
import { Status } from "./Status";

type ProjectAction = Item & {
  readonly type: ActionItemType;
};

const futureActionStatuses: readonly Status[] = [
  Status.Active,
  Status.Someday,
];

function isProjectAction(item: Item): item is ProjectAction {
  return item.type !== ItemType.Project;
}

function isFutureAction(item: ProjectAction): boolean {
  return futureActionStatuses.includes(item.status);
}

function compareByCreation(left: Item, right: Item): number {
  return (
    left.createdAt.getTime() - right.createdAt.getTime() ||
    left.id.localeCompare(right.id)
  );
}

function flattenItems(items: readonly Item[]): readonly Item[] {
  const flattened: Item[] = [];
  const seen = new Set<string>();

  function visit(item: Item) {
    if (seen.has(item.id)) {
      return;
    }

    seen.add(item.id);
    flattened.push(item);
    item.children.forEach(visit);
  }

  items.forEach(visit);
  return flattened;
}

function getProjectActions(
  project: Project,
  items: readonly Item[],
): readonly ProjectAction[] {
  const orderedChildren = project.children.filter(isProjectAction);
  const childIds = new Set(orderedChildren.map((item) => item.id));
  const legacyFlatChildren = flattenItems(items)
    .filter(
      (item): item is ProjectAction =>
        isProjectAction(item) &&
        item.parentId === project.id &&
        !childIds.has(item.id),
    )
    .sort(compareByCreation);

  return [...orderedChildren, ...legacyFlatChildren];
}

function activate(item: ProjectAction): ActionableItem {
  return isActionable(item) ? item : { ...item, status: Status.Today };
}

/**
 * Selects one active action without modifying persistence. Project child order
 * is authoritative: an existing Today action wins, otherwise the first future
 * action is projected into Today. Non-active Projects contribute no action.
 */
class NextActionCalculator {
  getNextAction(
    project: Project,
    items: readonly Item[],
  ): ActionableItem | null {
    if (project.status !== Status.Active) {
      return null;
    }

    const actions = getProjectActions(project, items);
    const explicitlyActive = actions.find(isActionable);
    const nextFutureAction = actions.find(isFutureAction);
    const selected = explicitlyActive ?? nextFutureAction;

    return selected ? activate(selected) : null;
  }

  /** Returns at most one Project action plus standalone Today Items. */
  getTodayActions(items: readonly Item[]): readonly ActionableItem[] {
    const allItems = flattenItems(items);
    const projects = allItems.filter(isProject);
    const projectActions = projects.flatMap((project) => {
      const action = this.getNextAction(project, allItems);
      return action ? [action] : [];
    });
    const standaloneActions = allItems.filter(
      (item): item is ActionableItem =>
        isActionable(item) && getProjectForItem(item, projects) === null,
    );
    const uniqueActions = new Map(
      [...projectActions, ...standaloneActions].map((item) => [item.id, item]),
    );

    return [...uniqueActions.values()];
  }
}

export { NextActionCalculator };
export type { ProjectAction };
