import {
  detectPatterns,
  selectDailyReviews,
  type AnalyticsReport,
  type Pattern,
} from "../domain";
import type { AnalyticsReportProvider } from "./AnalyticsService";
import type { DailyReviewRepository } from "../repositories/DailyReviewRepository";
import type { DailyWrapUpRepository } from "../repositories/DailyWrapUpRepository";

interface PatternProvider {
  getPatterns(analytics?: AnalyticsReport): Promise<readonly Pattern[]>;
}

/** Applies deterministic rules to historical Atlas evidence only. */
class PatternService implements PatternProvider {
  constructor(
    private readonly analytics: AnalyticsReportProvider,
    private readonly reviews: DailyReviewRepository,
    private readonly wrapUps: DailyWrapUpRepository,
  ) {}

  async getPatterns(report?: AnalyticsReport): Promise<readonly Pattern[]> {
    const [analytics, reviews, wrapUps] = await Promise.all([
      report ?? this.analytics.getReport(),
      this.reviews.getHistory(),
      this.wrapUps.getHistory(),
    ]);
    return detectPatterns({
      analytics,
      reviews: selectDailyReviews(reviews),
      wrapUps,
    });
  }
}

export { PatternService };
export type { PatternProvider };
