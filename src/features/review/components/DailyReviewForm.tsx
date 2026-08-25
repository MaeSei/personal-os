"use client";

import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { EnergySelector } from "@/features/review/components/EnergySelector";
import { MotivationSelector } from "@/features/review/components/MotivationSelector";
import { StressSelector } from "@/features/review/components/StressSelector";
import type {
  DailyReviewDraft,
  ReviewMetric,
  ReviewRating,
} from "@/features/review/types";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { motionStyles } from "@/theme/motion";
import { radiusStyles } from "@/theme/radius";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type DailyReviewFormProps = {
  readonly canSubmit: boolean;
  readonly draft: DailyReviewDraft;
  readonly error: string | null;
  readonly isSaving: boolean;
  readonly onNotesChange: (notes: string) => void;
  readonly onRatingChange: (metric: ReviewMetric, value: ReviewRating) => void;
  readonly onSubmit: () => void;
  readonly secondaryAction?: ReactNode;
  readonly submitLabel?: string;
};

/** Shared capacity check form used by Daily Review and Morning Planning. */
function DailyReviewForm({
  canSubmit,
  draft,
  error,
  isSaving,
  onNotesChange,
  onRatingChange,
  onSubmit,
  secondaryAction,
  submitLabel = "Estimate attention",
}: DailyReviewFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className={spacingStyles.cardStack} onSubmit={handleSubmit}>
      <EnergySelector
        onChange={(value) => onRatingChange("energy", value)}
        value={draft.energy}
      />
      <Divider />
      <StressSelector
        onChange={(value) => onRatingChange("stress", value)}
        value={draft.stress}
      />
      <Divider />
      <MotivationSelector
        onChange={(value) => onRatingChange("motivation", value)}
        value={draft.motivation}
      />
      <Divider />
      <div>
        <label
          className={cn(typographyStyles.cardTitle, colorStyles.text.primary)}
          htmlFor="review-notes"
        >
          Optional notes
        </label>
        <p
          className={cn(
            "mt-detail",
            typographyStyles.description,
            colorStyles.text.muted,
          )}
          id="review-notes-description"
        >
          Capture context if it helps. Notes do not change the score.
        </p>
        <textarea
          aria-describedby="review-notes-description"
          className={cn(
            "mt-card-compact min-h-32 w-full resize-y border p-card-compact",
            radiusStyles.control,
            typographyStyles.body,
            colorStyles.field,
            colorStyles.focusRing,
            motionStyles.field,
          )}
          id="review-notes"
          maxLength={500}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Anything affecting your capacity today?"
          value={draft.notes}
        />
      </div>
      <div className={cn(spacingStyles.cluster, "items-center")}>
        <Button disabled={!canSubmit || isSaving} size="lg" type="submit">
          {isSaving ? "Saving…" : submitLabel}
        </Button>
        {secondaryAction}
      </div>
      {error ? (
        <p
          className={cn(typographyStyles.description, "text-danger")}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}

export { DailyReviewForm, type DailyReviewFormProps };
