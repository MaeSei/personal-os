import {
  buildFocusModePlan,
  type AttentionEngine,
  type FocusModePlan,
} from "@/domain";
import type { DailyReviewRepository } from "@/repositories/DailyReviewRepository";
import type { ItemRepository } from "@/repositories/ItemRepository";

type FocusModeDependencies = {
  readonly attentionEngine: AttentionEngine;
  readonly itemRepository: ItemRepository;
  readonly reviewRepository: DailyReviewRepository;
};

/** Loads and reduces today's plan before it reaches the presentation layer. */
async function loadFocusMode({
  attentionEngine,
  itemRepository,
  reviewRepository,
}: FocusModeDependencies): Promise<FocusModePlan> {
  const [items, review] = await Promise.all([
    itemRepository.getItems(),
    reviewRepository.getLatestReview(),
  ]);
  const focusPlan = await attentionEngine.createFocusPlan(review, items);

  return buildFocusModePlan(focusPlan);
}

export { loadFocusMode };
export type { FocusModeDependencies };
