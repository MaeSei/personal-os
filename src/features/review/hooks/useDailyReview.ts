"use client";

import { useState } from "react";

import type { ReviewFeature } from "@/features/contracts/ReviewFeature";
import type {
  DailyReviewDraft,
  DailyReviewResult,
  ReviewMetric,
  ReviewRating,
} from "@/features/review/types";

const initialDraft: DailyReviewDraft = {
  energy: null,
  motivation: null,
  notes: "",
  stress: null,
};

/** Owns the temporary, browser-only state for one Daily Review. */
function useDailyReview(
  review: Pick<ReviewFeature, "completeReview">,
) {
  const [draft, setDraft] = useState<DailyReviewDraft>(initialDraft);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<DailyReviewResult | null>(null);

  const canSubmit =
    draft.energy !== null &&
    draft.motivation !== null &&
    draft.stress !== null;

  function setRating(metric: ReviewMetric, value: ReviewRating) {
    setDraft((current) => ({ ...current, [metric]: value }));
    setError(null);
    setResult(null);
  }

  function setNotes(notes: string) {
    setDraft((current) => ({ ...current, notes }));
  }

  async function submit(): Promise<DailyReviewResult | null> {
    if (
      isSaving ||
      draft.energy === null ||
      draft.motivation === null ||
      draft.stress === null
    ) {
      return null;
    }

    setError(null);
    setIsSaving(true);

    try {
      const nextResult = await review.completeReview({
        energy: draft.energy,
        motivation: draft.motivation,
        notes: draft.notes,
        stress: draft.stress,
      });

      setResult(nextResult);
      return nextResult;
    } catch {
      setError("Atlas could not save this review. Please try again.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  function reset() {
    setDraft(initialDraft);
    setError(null);
    setResult(null);
  }

  return {
    canSubmit,
    draft,
    error,
    isSaving,
    reset,
    result,
    setNotes,
    setRating,
    submit,
  };
}

export { useDailyReview };
