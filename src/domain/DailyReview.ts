import type { CalendarDate } from "./Item";

/** A Daily Review response on the shared one-to-five scale. */
const REVIEW_RATING_MAX = 5;

type ReviewRating = 1 | 2 | 3 | 4 | 5;

type DailyReviewInput = {
  readonly energy: ReviewRating;
  readonly motivation: ReviewRating;
  readonly notes?: string | null;
  readonly stress: ReviewRating;
};

type DailyReviewResult = DailyReviewInput & {
  readonly attentionBudget: number;
  readonly date: CalendarDate;
  readonly notes: string | null;
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

function assertCalendarDate(value: string): asserts value is CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : null;

  if (
    !match ||
    !date ||
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    throw new Error("A Daily Review requires a valid YYYY-MM-DD date.");
  }
}

/** Creates one immutable, deterministic review record for a calendar day. */
function createDailyReviewResult(
  input: DailyReviewInput,
  date: string = new Date().toISOString().slice(0, 10),
): DailyReviewResult {
  assertCalendarDate(date);
  const attentionBudget = calculateDailyAttention(input);

  return {
    energy: input.energy,
    motivation: input.motivation,
    notes: input.notes?.trim() || null,
    stress: input.stress,
    attentionBudget,
    date,
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
