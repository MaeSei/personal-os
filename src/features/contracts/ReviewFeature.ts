import type { DailyReviewInput, DailyReviewResult } from "@/domain";

/** Daily Review query and command contract exposed to feature UI. */
interface ReviewFeature {
  completeReview(input: DailyReviewInput): Promise<DailyReviewResult>;
  getLatestReview(): Promise<DailyReviewResult | null>;
  getReviewHistory(): Promise<readonly DailyReviewResult[]>;
}

export type { ReviewFeature };
