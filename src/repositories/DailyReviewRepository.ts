import type { DailyReviewResult } from "../domain";

/** Append-only persistence boundary for historical Daily Reviews. */
interface DailyReviewRepository {
  get(): Promise<DailyReviewResult | null>;
  getHistory(): Promise<readonly DailyReviewResult[]>;
  save(review: DailyReviewResult): Promise<void>;
}

export type { DailyReviewRepository };
