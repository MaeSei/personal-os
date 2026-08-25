import type { DailyReviewResult } from "../domain";
import type { DailyReviewRepository } from "./DailyReviewRepository";

/** In-memory Daily Review repository retained for isolated service tests. */
class MockDailyReviewRepository implements DailyReviewRepository {
  private history: DailyReviewResult[];

  constructor(review: DailyReviewResult | null = null) {
    this.history = review ? [review] : [];
  }

  get(): Promise<DailyReviewResult | null> {
    return Promise.resolve(this.history[0] ?? null);
  }

  getHistory(): Promise<readonly DailyReviewResult[]> {
    return Promise.resolve([...this.history]);
  }

  save(review: DailyReviewResult): Promise<void> {
    this.history = [review, ...this.history];
    return Promise.resolve();
  }
}

export { MockDailyReviewRepository };
