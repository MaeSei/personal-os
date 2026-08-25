import type { CalendarDate, Item, ItemId } from "./Item";
import { getProjectForItem, isProject } from "./Project";
import { getProjectTaskRoots } from "./ProjectWorkspace";
import { Status } from "./Status";
import { isTask, type Task } from "./Task";

const DEFAULT_PLANNING_SUGGESTION_LIMIT = 3;

enum PlanningRuleMatch {
  Available = "available",
  Context = "context",
  Due = "due",
  FitsTime = "fits-time",
  ScheduledToday = "scheduled-today",
  Today = "today",
}

type PlanningRulesInput = {
  readonly availableMinutes: number | null;
  readonly currentContext?: string | null;
  readonly date: CalendarDate;
  readonly excludedTaskIds?: readonly ItemId[];
  readonly items: readonly Item[];
  readonly limit?: number;
};

type PlanningSuggestion = {
  readonly matchedRules: readonly PlanningRuleMatch[];
  readonly reason: string;
  readonly task: Task;
};

type ScoredSuggestion = PlanningSuggestion & { readonly score: number };

function flattenItems(items: readonly Item[]): readonly Item[] {
  const flattened: Item[] = [];
  const seen = new Set<ItemId>();
  function visit(item: Item) {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    flattened.push(item);
    item.children.forEach(visit);
  }
  items.forEach(visit);
  return flattened;
}

function isAvailable(task: Task, excluded: ReadonlySet<ItemId>): boolean {
  return (
    !excluded.has(task.id) &&
    [Status.Active, Status.Today].includes(task.status)
  );
}

function getCandidates(
  items: readonly Item[],
  excluded: ReadonlySet<ItemId>,
): readonly Task[] {
  const allItems = flattenItems(items);
  const projects = allItems.filter(isProject);
  const projectTasks = projects
    .filter(({ status }) => status === Status.Active)
    .flatMap((project) => {
      const task = flattenItems(getProjectTaskRoots(project, items)).find(
        (item): item is Task => isTask(item) && isAvailable(item, excluded),
      );
      return task ? [task] : [];
    });
  const standaloneTasks = allItems.filter(
    (item): item is Task =>
      isTask(item) &&
      isAvailable(item, excluded) &&
      item.projectId === null &&
      getProjectForItem(item, projects) === null,
  );

  return [...new Map(
    [...projectTasks, ...standaloneTasks].map((task) => [task.id, task]),
  ).values()];
}

function normalizeContext(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/^@/, "").toLowerCase();
  return normalized || null;
}

function clampAttention(value: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 0;
}

function getMatchedRules(
  task: Task,
  input: PlanningRulesInput,
): readonly PlanningRuleMatch[] {
  const rules = [PlanningRuleMatch.Available];
  if (task.status === Status.Today) rules.push(PlanningRuleMatch.Today);
  if (task.scheduledDate === input.date) rules.push(PlanningRuleMatch.ScheduledToday);
  if (task.dueDate && task.dueDate <= input.date) rules.push(PlanningRuleMatch.Due);
  const context = normalizeContext(input.currentContext);
  if (context && normalizeContext(task.preferredContext ?? task.context) === context) {
    rules.push(PlanningRuleMatch.Context);
  }
  const estimate = task.estimatedDuration ?? task.durationMinutes;
  if (
    input.availableMinutes !== null &&
    estimate !== null &&
    estimate !== undefined &&
    estimate <= input.availableMinutes
  ) rules.push(PlanningRuleMatch.FitsTime);
  return rules;
}

function scoreTask(
  task: Task,
  rules: readonly PlanningRuleMatch[],
  input: PlanningRulesInput,
): number {
  const has = (rule: PlanningRuleMatch) => rules.includes(rule);
  const taskContext = normalizeContext(task.preferredContext ?? task.context);
  const currentContext = normalizeContext(input.currentContext);
  const estimate = task.estimatedDuration ?? task.durationMinutes;
  const contextMismatch = currentContext && taskContext && currentContext !== taskContext;
  const exceedsTime = input.availableMinutes !== null && estimate !== null &&
    estimate !== undefined && estimate > input.availableMinutes;

  return (
    clampAttention(task.attentionScore) +
    (has(PlanningRuleMatch.ScheduledToday) ? 35 : 0) +
    (has(PlanningRuleMatch.Context) ? 30 : 0) +
    (has(PlanningRuleMatch.FitsTime) ? 25 : 0) +
    (has(PlanningRuleMatch.Due) ? 20 : 0) +
    (has(PlanningRuleMatch.Today) ? 15 : 0) -
    (contextMismatch ? 10 : 0) -
    (exceedsTime ? 20 : 0)
  );
}

function getReason(task: Task, rules: readonly PlanningRuleMatch[]): string {
  const has = (rule: PlanningRuleMatch) => rules.includes(rule);
  if (has(PlanningRuleMatch.Context) && has(PlanningRuleMatch.FitsTime)) {
    return "Matches your current context and fits the available time.";
  }
  if (has(PlanningRuleMatch.ScheduledToday)) return "Already intended for today.";
  if (has(PlanningRuleMatch.Due)) return "Due now and still available.";
  if (has(PlanningRuleMatch.Context)) return "Matches your current context.";
  if (has(PlanningRuleMatch.FitsTime)) return "Fits the available time.";
  if (task.projectId) return "The next available action for this Project.";
  return "Available standalone work with a clear next step.";
}

function assertInput(input: PlanningRulesInput): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : null;
  if (
    !match || !date ||
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    throw new Error("Planning Rules require a YYYY-MM-DD date.");
  }
  if (
    input.availableMinutes !== null &&
    (!Number.isInteger(input.availableMinutes) || input.availableMinutes < 0)
  ) throw new Error("Available time must be non-negative whole minutes.");
  if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 0)) {
    throw new Error("The suggestion limit must be a non-negative integer.");
  }
}

/** Pure deterministic rules for deciding which available Tasks to suggest. */
class PlanningRulesEngine {
  getSuggestions(input: PlanningRulesInput): readonly PlanningSuggestion[] {
    assertInput(input);
    const excluded = new Set(input.excludedTaskIds ?? []);
    const scored: ScoredSuggestion[] = getCandidates(input.items, excluded).map((task) => {
      const matchedRules = getMatchedRules(task, input);
      return {
        matchedRules,
        reason: getReason(task, matchedRules),
        score: scoreTask(task, matchedRules, input),
        task,
      };
    });

    return scored
      .sort((left, right) =>
        right.score - left.score ||
        clampAttention(right.task.attentionScore) - clampAttention(left.task.attentionScore) ||
        left.task.energyCost - right.task.energyCost ||
        left.task.createdAt.getTime() - right.task.createdAt.getTime() ||
        left.task.id.localeCompare(right.task.id),
      )
      .slice(0, input.limit ?? DEFAULT_PLANNING_SUGGESTION_LIMIT)
      .map(({ matchedRules, reason, task }) => ({ matchedRules, reason, task }));
  }
}

export {
  DEFAULT_PLANNING_SUGGESTION_LIMIT,
  PlanningRuleMatch,
  PlanningRulesEngine,
};
export type { PlanningRulesInput, PlanningSuggestion };
