import {
  calculateAnalyticsReport,
  type AnalyticsReport,
} from "../domain";
import type { DailyReviewRepository } from "../repositories/DailyReviewRepository";
import type { DailyWrapUpRepository } from "../repositories/DailyWrapUpRepository";
import type { ItemRepository } from "../repositories/ItemRepository";

interface AnalyticsReportProvider {
  getReport(): Promise<AnalyticsReport>;
}

/** Reads Atlas history and delegates all calculations to pure domain logic. */
class AnalyticsService implements AnalyticsReportProvider {
  constructor(
    private readonly reviews: DailyReviewRepository,
    private readonly wrapUps: DailyWrapUpRepository,
    private readonly items: ItemRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getReport(): Promise<AnalyticsReport> {
    const [reviews, wrapUps, items] = await Promise.all([
      this.reviews.getHistory(),
      this.wrapUps.getHistory(),
      this.items.get(),
    ]);
    return calculateAnalyticsReport({
      generatedAt: this.now(),
      items,
      reviews,
      wrapUps,
    });
  }
}

export { AnalyticsService };
export type { AnalyticsReportProvider };
