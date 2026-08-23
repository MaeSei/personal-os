/** A Daily Review response on the shared one-to-five scale. */
const REVIEW_RATING_MAX = 5;

type ReviewRating = 1 | 2 | 3 | 4 | 5;

type DailyReviewInput = {
  readonly energy: ReviewRating;
  readonly motivation: ReviewRating;
  readonly stress: ReviewRating;
};

type DailyReviewResult = DailyReviewInput & {
  readonly attentionBudget: number;
  readonly summary: string;
};

const summaries = {
  high:
    "You have a high attention budget today.\n\nThis is a good day for deep work.",
  limited:
    "Your available attention appears limited today.\n\nFocus on one important outcome.",
  moderate:
    "Your attention budget is moderate today.\n\nKeep the plan simple and protect your energy.",
  steady:
    "You have a steady attention budget today.\n\nChoose meaningful work and leave room to adapt.",
} as const;

/**
 * Estimates available attention on a 0–100 scale.
 *
 * Energy contributes up to 30 points, motivation up to 25, and inverse stress
 * up to 40. Stress carries the most weight because pressure consumes capacity
 * even when energy and motivation are high. Valid ratings produce 19–95.
 */
function calculateDailyAttention(input: DailyReviewInput): number {
  const inverseStress = 6 - input.stress;

  return input.energy * 6 + input.motivation * 5 + inverseStress * 8;
}

/** Selects calm, predefined guidance from the calculated attention budget. */
function getDailyReviewSummary(attentionBudget: number): string {
  if (attentionBudget >= 80) {
    return summaries.high;
  }

  if (attentionBudget >= 60) {
    return summaries.steady;
  }

  if (attentionBudget >= 40) {
    return summaries.moderate;
  }

  return summaries.limited;
}

/** Creates the complete deterministic result consumed by the review UI. */
function createDailyReviewResult(input: DailyReviewInput): DailyReviewResult {
  const attentionBudget = calculateDailyAttention(input);

  return {
    ...input,
    attentionBudget,
    summary: getDailyReviewSummary(attentionBudget),
  };
}

export {
  REVIEW_RATING_MAX,
  calculateDailyAttention,
  createDailyReviewResult,
  getDailyReviewSummary,
};
export type { DailyReviewInput, DailyReviewResult, ReviewRating };
