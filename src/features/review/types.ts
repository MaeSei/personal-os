import type { ReviewRating } from "@/domain";

const REVIEW_RATINGS = [1, 2, 3, 4, 5] as const satisfies readonly ReviewRating[];

type ReviewMetric = "energy" | "motivation" | "stress";

type DailyReviewDraft = Record<ReviewMetric, ReviewRating | null> & {
  notes: string;
};

export { REVIEW_RATINGS };
export type {
  DailyReviewInput,
  DailyReviewResult,
  ReviewRating,
} from "@/domain";
export type { DailyReviewDraft, ReviewMetric };
