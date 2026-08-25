import type { DailyReviewResult } from "./DailyReview";
import { isBlocked, type ActionableItem } from "./Focus";
import type { Item } from "./Item";
import { NextActionCalculator } from "./NextActionCalculator";
import { isTask, type Task } from "./Task";

const MAX_FOCUS_ITEMS = 3;
const ATTENTION_PER_FOCUS_SLOT = 35;
const ATTENTION_PER_ENERGY_LEVEL = 20;
const ENERGY_COST_WEIGHT = 3;
const ENERGY_OVERLOAD_PENALTY = 15;
const SWITCHING_COST_WEIGHT = 12;

type FocusPlan = {
  /** The small set Atlas recommends advancing today. */
  readonly focusItems: readonly ActionableItem[];
  /** Today Items that remain valid but are intentionally not selected. */
  readonly deferredItems: readonly ActionableItem[];
  /** Blocked Items shown separately and never considered for focus. */
  readonly blockedItems: readonly Task[];
};

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 100);
}

function clampAttentionScore(value: number): number {
  return clampPercentage(value);
}

/** Low-budget days intentionally receive fewer commitments. */
function getFocusLimit(attentionBudget: number): number {
  const budget = clampPercentage(attentionBudget);

  if (budget === 0) {
    return 0;
  }

  return Math.min(MAX_FOCUS_ITEMS, Math.ceil(budget / ATTENTION_PER_FOCUS_SLOT));
}

/** Converts the percentage budget into the Item energy scale used by Atlas. */
function getSupportedEnergy(attentionBudget: number): number {
  const budget = clampPercentage(attentionBudget);

  if (budget === 0) {
    return 0;
  }

  return Math.min(5, Math.max(1, Math.round(budget / ATTENTION_PER_ENERGY_LEVEL)));
}

function sharesProjectContext(left: Item, right: Item): boolean {
  return (
    (left.projectId !== null &&
      left.projectId !== undefined &&
      left.projectId === right.projectId) ||
    left.parentId === right.id ||
    right.parentId === left.id ||
    (left.parentId !== null && left.parentId === right.parentId)
  );
}

/** Zero is the same project, one the same area, and two a new area. */
function getSwitchingCost(item: Item, selected: readonly Item[]): number {
  if (selected.length === 0) {
    return 0;
  }

  return Math.min(
    ...selected.map((focusItem) => {
      if (sharesProjectContext(item, focusItem)) {
        return 0;
      }

      return item.areaId !== null && item.areaId === focusItem.areaId ? 1 : 2;
    }),
  );
}

function scoreCandidate(
  item: Item,
  selected: readonly Item[],
  supportedEnergy: number,
): number {
  const impact = clampAttentionScore(item.attentionScore);
  const energyCost = item.energyCost * ENERGY_COST_WEIGHT;
  const overload = Math.max(item.energyCost - supportedEnergy, 0);
  const switchingCost = getSwitchingCost(item, selected);

  return (
    impact -
    energyCost -
    overload * ENERGY_OVERLOAD_PENALTY -
    switchingCost * SWITCHING_COST_WEIGHT
  );
}

function rankItems<T extends Item>(
  items: readonly T[],
  selected: readonly Item[],
  supportedEnergy: number,
): T[] {
  return [...items].sort(
    (left, right) =>
      scoreCandidate(right, selected, supportedEnergy) -
        scoreCandidate(left, selected, supportedEnergy) ||
      clampAttentionScore(right.attentionScore) -
        clampAttentionScore(left.attentionScore) ||
      left.energyCost - right.energyCost ||
      left.id.localeCompare(right.id),
  );
}

/**
 * Creates a deterministic focus plan without mutating the repository Items.
 * Each Project contributes at most one calculated next action.
 */
function buildFocusPlan(
  review: DailyReviewResult | null,
  items: readonly Item[],
  nextActionCalculator = new NextActionCalculator(),
): FocusPlan {
  const blockedItems = items.filter(
    (item): item is Task => isTask(item) && isBlocked(item),
  );
  let remaining: ActionableItem[] = [
    ...nextActionCalculator.getTodayActions(items),
  ];
  const focusItems: ActionableItem[] = [];

  if (!review) {
    return {
      blockedItems,
      deferredItems: remaining,
      focusItems,
    };
  }

  const focusLimit = getFocusLimit(review.attentionBudget);
  const supportedEnergy = getSupportedEnergy(review.attentionBudget);

  while (focusItems.length < focusLimit && remaining.length > 0) {
    const [nextItem, ...rest] = rankItems(
      remaining,
      focusItems,
      supportedEnergy,
    );

    focusItems.push(nextItem);
    remaining = rest;
  }

  return {
    blockedItems,
    deferredItems: rankItems(remaining, focusItems, supportedEnergy),
    focusItems,
  };
}

export { buildFocusPlan };
export type { FocusPlan };
