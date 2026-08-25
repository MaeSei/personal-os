import {
  createDailyReviewResult,
  type DailyReviewInput,
  type DailyReviewResult,
} from "../domain";
import type { ReviewFeature } from "@/features/contracts/ReviewFeature";
import type { DailyReviewRepository } from "@/repositories/DailyReviewRepository";

type ReviewDateProvider = () => string;

/** Application boundary for completing and retrieving a Daily Review. */
class ReviewService implements ReviewFeature {
  constructor(
    private readonly reviewRepository: DailyReviewRepository,
    private readonly getReviewDate: ReviewDateProvider = () =>
      new Date().toISOString().slice(0, 10),
  ) {}

  async completeReview(input: DailyReviewInput): Promise<DailyReviewResult> {
    const result = createDailyReviewResult(input, this.getReviewDate());

    await this.reviewRepository.save(result);
    return result;
  }

  getLatestReview(): Promise<DailyReviewResult | null> {
    return this.reviewRepository.get();
  }

  getReviewHistory(): Promise<readonly DailyReviewResult[]> {
    return this.reviewRepository.getHistory();
  }
}

export { ReviewService };
