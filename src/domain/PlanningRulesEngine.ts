import type { EnergyLevel } from "./Attention";
import type { CalendarDate, Item, ItemId } from "./Item";
import { canCompleteInContext, getTaskContexts, normalizeContext } from "./ContextEngine";
import { getProjectForItem, isProject } from "./Project";
import { getProjectTaskRoots } from "./ProjectWorkspace";
import { Status } from "./Status";
import { isTask, type Task } from "./Task";

const DEFAULT_PLANNING_SUGGESTION_LIMIT = 3;
const DEFAULT_PLANNING_DURATION_MINUTES = 30;

enum PlanningRuleMatch {
  Available = "available",
  Context = "context",
  Due = "due",
  Energy = "energy",
  FitsTime = "fits-time",
  Dependencies = "dependencies",
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

type PlanningAvailableSlot = {
  readonly end: number;
  readonly start: number;
};

type PlanningDependency = {
  readonly prerequisiteTaskIds: readonly ItemId[];
  readonly taskId: ItemId;
};

type PlanningPlacementInput = Omit<PlanningRulesInput, "availableMinutes"> & {
  readonly availableEnergy: EnergyLevel | null;
  readonly availableSlots: readonly PlanningAvailableSlot[];
  readonly dependencies?: readonly PlanningDependency[];
};

type SuggestedPlacement = PlanningSuggestion & {
  readonly duration: number;
  readonly end: number;
  readonly start: number;
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
  isReady: (task: Task) => boolean = () => true,
): readonly Task[] {
  const allItems = flattenItems(items);
  const projects = allItems.filter(isProject);
  const projectTasks = projects
    .filter(({ status }) => status === Status.Active)
    .flatMap((project) => {
      const task = flattenItems(getProjectTaskRoots(project, items)).find(
        (item): item is Task =>
          isTask(item) && isAvailable(item, excluded) && isReady(item),
      );
      return task ? [task] : [];
    });
  const standaloneTasks = allItems.filter(
    (item): item is Task =>
      isTask(item) &&
      isAvailable(item, excluded) &&
      isReady(item) &&
      item.projectId === null &&
      getProjectForItem(item, projects) === null,
  );

  return [...new Map(
    [...projectTasks, ...standaloneTasks].map((task) => [task.id, task]),
  ).values()];
}

function getDuration(task: Task): number {
  return task.estimatedDuration ?? task.durationMinutes ??
    DEFAULT_PLANNING_DURATION_MINUTES;
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
  if (
    context &&
    getTaskContexts(task).length > 0 &&
    canCompleteInContext(task, context)
  ) {
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
  const taskContexts = getTaskContexts(task);
  const currentContext = normalizeContext(input.currentContext);
  const estimate = task.estimatedDuration ?? task.durationMinutes;
  const contextMismatch =
    currentContext &&
    taskContexts.length > 0 &&
    !canCompleteInContext(task, currentContext);
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

function getDependencyMap(
  dependencies: readonly PlanningDependency[],
): ReadonlyMap<ItemId, ReadonlySet<ItemId>> {
  const result = new Map<ItemId, Set<ItemId>>();
  dependencies.forEach(({ prerequisiteTaskIds, taskId }) => {
    const prerequisites = result.get(taskId) ?? new Set<ItemId>();
    prerequisiteTaskIds.forEach((id) => prerequisites.add(id));
    result.set(taskId, prerequisites);
  });
  return result;
}

function dependenciesAreSatisfied(
  taskId: ItemId,
  dependencies: ReadonlyMap<ItemId, ReadonlySet<ItemId>>,
  itemsById: ReadonlyMap<ItemId, Item>,
): boolean {
  const prerequisites = dependencies.get(taskId);
  return !prerequisites || [...prerequisites].every((id) => {
    const prerequisite = itemsById.get(id);
    return Boolean(
      prerequisite && isTask(prerequisite) &&
      prerequisite.status === Status.Completed,
    );
  });
}

function normalizeSlots(
  slots: readonly PlanningAvailableSlot[],
): PlanningAvailableSlot[] {
  const sorted = slots
    .map(({ end, start }) => ({ end, start }))
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const merged: PlanningAvailableSlot[] = [];

  sorted.forEach((slot) => {
    const previous = merged.at(-1);
    if (previous && slot.start <= previous.end) {
      merged[merged.length - 1] = {
        end: Math.max(previous.end, slot.end),
        start: previous.start,
      };
    } else {
      merged.push(slot);
    }
  });

  return merged;
}

function scorePlacement(
  task: Task,
  rules: readonly PlanningRuleMatch[],
  input: PlanningPlacementInput,
  scoringInput: PlanningRulesInput,
): number {
  const energyFit = input.availableEnergy !== null &&
    task.energyCost <= input.availableEnergy;
  const energyMismatch = input.availableEnergy !== null &&
    task.energyCost > input.availableEnergy;

  return scoreTask(task, rules, scoringInput) +
    (energyFit ? 25 : 0) -
    (energyMismatch ? 30 : 0);
}

function getPlacementReason(
  task: Task,
  rules: readonly PlanningRuleMatch[],
  duration: number,
): string {
  const has = (rule: PlanningRuleMatch) => rules.includes(rule);
  const fit = `Fits an available ${duration}-minute window`;
  if (has(PlanningRuleMatch.Context) && has(PlanningRuleMatch.Energy)) {
    return `${fit} and matches your current context and energy.`;
  }
  if (has(PlanningRuleMatch.Context)) {
    return `${fit} and matches your current context.`;
  }
  if (has(PlanningRuleMatch.Energy)) {
    return `${fit} and matches your available energy.`;
  }
  if (has(PlanningRuleMatch.Dependencies)) {
    return `${fit}; its prerequisites are complete.`;
  }
  return `${fit}.`;
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

function assertPlacementInput(input: PlanningPlacementInput): void {
  assertInput({ ...input, availableMinutes: null });
  if (
    input.availableEnergy !== null &&
    (!Number.isInteger(input.availableEnergy) ||
      input.availableEnergy < 0 || input.availableEnergy > 5)
  ) {
    throw new Error("Available energy must be a whole level from 0 to 5.");
  }
  input.availableSlots.forEach(({ end, start }) => {
    if (
      !Number.isInteger(start) || !Number.isInteger(end) ||
      start < 0 || end > 24 * 60 || end <= start
    ) {
      throw new Error("Available Slots require valid whole minutes within one day.");
    }
  });
  input.dependencies?.forEach(({ prerequisiteTaskIds, taskId }) => {
    if (!taskId.trim() || prerequisiteTaskIds.some((id) => !id.trim())) {
      throw new Error("Planning dependencies require non-empty Task IDs.");
    }
    if (prerequisiteTaskIds.includes(taskId)) {
      throw new Error("A Task cannot depend on itself.");
    }
  });
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

  /** Returns an explained, non-writing placement proposal for available Tasks. */
  getSuggestedPlacements(
    input: PlanningPlacementInput,
  ): readonly SuggestedPlacement[] {
    assertPlacementInput(input);
    const slots = normalizeSlots(input.availableSlots);
    const allItems = flattenItems(input.items);
    const itemsById = new Map(allItems.map((item) => [item.id, item]));
    const dependencies = getDependencyMap(input.dependencies ?? []);
    const excluded = new Set(input.excludedTaskIds ?? []);
    const maxSlotMinutes = Math.max(0, ...slots.map(({ end, start }) => end - start));
    const scoringInput: PlanningRulesInput = {
      ...input,
      availableMinutes: maxSlotMinutes,
    };
    const scored = getCandidates(
      input.items,
      excluded,
      (task) => dependenciesAreSatisfied(task.id, dependencies, itemsById),
    ).map((task) => {
      const matchedRules = [...getMatchedRules(task, scoringInput)];
      if (
        !matchedRules.includes(PlanningRuleMatch.FitsTime) &&
        getDuration(task) <= maxSlotMinutes
      ) matchedRules.push(PlanningRuleMatch.FitsTime);
      if (
        input.availableEnergy !== null &&
        task.energyCost <= input.availableEnergy
      ) matchedRules.push(PlanningRuleMatch.Energy);
      if ((dependencies.get(task.id)?.size ?? 0) > 0) {
        matchedRules.push(PlanningRuleMatch.Dependencies);
      }
      return {
        matchedRules,
        score: scorePlacement(task, matchedRules, input, scoringInput),
        task,
      };
    }).sort((left, right) =>
      right.score - left.score ||
      clampAttention(right.task.attentionScore) - clampAttention(left.task.attentionScore) ||
      left.task.energyCost - right.task.energyCost ||
      left.task.createdAt.getTime() - right.task.createdAt.getTime() ||
      left.task.id.localeCompare(right.task.id),
    );
    const placements: SuggestedPlacement[] = [];

    for (const suggestion of scored) {
      if (placements.length >= (input.limit ?? DEFAULT_PLANNING_SUGGESTION_LIMIT)) break;
      const duration = getDuration(suggestion.task);
      const slotIndex = slots.findIndex(({ end, start }) => end - start >= duration);
      if (slotIndex < 0) continue;
      const slot = slots[slotIndex];
      const end = slot.start + duration;
      placements.push({
        duration,
        end,
        matchedRules: suggestion.matchedRules,
        reason: getPlacementReason(suggestion.task, suggestion.matchedRules, duration),
        start: slot.start,
        task: suggestion.task,
      });
      if (end === slot.end) slots.splice(slotIndex, 1);
      else slots[slotIndex] = { end: slot.end, start: end };
    }

    return placements;
  }
}

export {
  DEFAULT_PLANNING_SUGGESTION_LIMIT,
  DEFAULT_PLANNING_DURATION_MINUTES,
  PlanningRuleMatch,
  PlanningRulesEngine,
};
export type {
  PlanningAvailableSlot,
  PlanningDependency,
  PlanningPlacementInput,
  PlanningRulesInput,
  PlanningSuggestion,
  SuggestedPlacement,
};
