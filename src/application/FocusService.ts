import {
  buildFocusModePlan,
  completeItem as completeDomainItem,
  DayPlanStatus,
  getPlannedTasks,
  type AttentionEngine,
  type FocusModePlan,
  type Item,
  type ItemId,
} from "../domain";
import type { FocusFeature } from "@/features/contracts/FocusFeature";
import type { DailyReviewRepository } from "@/repositories/DailyReviewRepository";
import type { ItemRepository } from "@/repositories/ItemRepository";
import type { DayPlanRepository } from "@/repositories/DayPlanRepository";

type FocusDateProvider = () => string;

/** Application boundary for focus planning and completion. */
class FocusService implements FocusFeature {
  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly reviewRepository: DailyReviewRepository,
    private readonly attentionEngine: AttentionEngine,
    private readonly dayPlanRepository: DayPlanRepository,
    private readonly getDate: FocusDateProvider,
  ) {}

  completeItem(itemId: ItemId): Promise<Item | null> {
    return this.completeAndSaveItem(itemId);
  }

  private async completeAndSaveItem(itemId: ItemId): Promise<Item | null> {
    const result = completeDomainItem(
      await this.itemRepository.get(),
      itemId,
    );

    if (!result.completedItem) {
      return null;
    }

    await this.itemRepository.save(result.items);
    return result.completedItem;
  }

  async loadFocusMode(): Promise<FocusModePlan> {
    const date = this.getDate();
    const [items, review, dayPlan] = await Promise.all([
      this.itemRepository.get(),
      this.reviewRepository.get(),
      this.dayPlanRepository.get(date),
    ]);
    const focusPlan = await this.attentionEngine.createFocusPlan(
      review?.date === date ? review : null,
      items,
    );

    if (dayPlan?.status === DayPlanStatus.Started) {
      return buildFocusModePlan({
        ...focusPlan,
        deferredItems: [],
        focusItems: getPlannedTasks(dayPlan, items),
      });
    }

    return buildFocusModePlan(focusPlan);
  }
}

export { FocusService };
