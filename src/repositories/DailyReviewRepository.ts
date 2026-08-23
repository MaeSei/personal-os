import type { DailyReviewResult } from "../domain";

/** Read boundary for the Daily Review that should guide today's planning. */
interface DailyReviewRepository {
  getLatestReview(): Promise<DailyReviewResult | null>;
}

export type { DailyReviewRepository };
