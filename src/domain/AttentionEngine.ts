import type { DailyReviewResult } from "./DailyReview";
import type { ActionableItem } from "./Focus";
import { buildFocusPlan, type FocusPlan } from "./FocusPlan";
import type { Item } from "./Item";
import { NextActionCalculator } from "./NextActionCalculator";

const FOCUS_LIMIT = 3;
const ENERGY_BONUS_PER_LEVEL = 5;

/** Stable boundary that a future rule-based or AI implementation can satisfy. */
interface AttentionEngine {
  createFocusPlan(
    review: DailyReviewResult | null,
    items: readonly Item[],
  ): Promise<FocusPlan>;
  getTodaysFocus(items: readonly Item[]): Promise<readonly ActionableItem[]>;
}

type ScoredItem = {
  item: ActionableItem;
  score: number;
};

function clampAttention(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.min(Math.max(score, 0), 100);
}

function scoreItem(item: Item): number {
  const attention = clampAttention(item.attentionScore);
  const energyBonus = (5 - item.energyCost) * ENERGY_BONUS_PER_LEVEL;

  return attention + energyBonus;
}

/**
 * Selects the three strongest focus candidates without mutating the input.
 * Stable tie-breakers favor attention, then lower energy, older activity, and id.
 */
function selectTodaysFocus(
  items: readonly Item[],
  nextActionCalculator = new NextActionCalculator(),
): readonly ActionableItem[] {
  return nextActionCalculator
    .getTodayActions(items)
    .map((item): ScoredItem => ({ item, score: scoreItem(item) }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        clampAttention(right.item.attentionScore) -
          clampAttention(left.item.attentionScore) ||
        left.item.energyCost - right.item.energyCost ||
        left.item.updatedAt.getTime() - right.item.updatedAt.getTime() ||
        left.item.id.localeCompare(right.item.id),
    )
    .slice(0, FOCUS_LIMIT)
    .map(({ item }) => item);
}

/** Current deterministic implementation of the Attention Engine contract. */
class RuleBasedAttentionEngine implements AttentionEngine {
  constructor(
    private readonly nextActionCalculator = new NextActionCalculator(),
  ) {}

  createFocusPlan(
    review: DailyReviewResult | null,
    items: readonly Item[],
  ): Promise<FocusPlan> {
    return Promise.resolve(
      buildFocusPlan(review, items, this.nextActionCalculator),
    );
  }

  getTodaysFocus(items: readonly Item[]): Promise<readonly ActionableItem[]> {
    return Promise.resolve(
      selectTodaysFocus(items, this.nextActionCalculator),
    );
  }
}

export { RuleBasedAttentionEngine, selectTodaysFocus };
export type { AttentionEngine };
