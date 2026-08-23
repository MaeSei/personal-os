import type { DailyReviewResult } from "../domain";
import type { DailyReviewRepository } from "./DailyReviewRepository";

/** In-memory repository retained for isolated domain and loader tests. */
class MockDailyReviewRepository implements DailyReviewRepository {
  constructor(private readonly review: DailyReviewResult | null = null) {}

  getLatestReview(): Promise<DailyReviewResult | null> {
    return Promise.resolve(this.review);
  }
}

export { MockDailyReviewRepository };
