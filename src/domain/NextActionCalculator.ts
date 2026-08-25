import {
  isActionable,
  type ActionableItem,
} from "./Focus";
import type { Item } from "./Item";
import { getProjectForItem, isProject, type Project } from "./Project";
import { getProjectTaskRoots } from "./ProjectWorkspace";
import { Status } from "./Status";
import { isTask, type Task } from "./Task";

type ProjectAction = Task;

const futureActionStatuses: readonly Status[] = [
  Status.Active,
  Status.Someday,
];

function isFutureAction(item: ProjectAction): boolean {
  return futureActionStatuses.includes(item.status);
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
  return flattenItems(getProjectTaskRoots(project, items)).filter(isTask);
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
