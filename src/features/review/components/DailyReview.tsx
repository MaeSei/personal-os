"use client";

import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { EnergySelector } from "@/features/review/components/EnergySelector";
import { MotivationSelector } from "@/features/review/components/MotivationSelector";
import { ReviewSummary } from "@/features/review/components/ReviewSummary";
import { StressSelector } from "@/features/review/components/StressSelector";
import { useDailyReview } from "@/features/review/hooks/useDailyReview";
import { cn } from "@/lib/cn";
import { LocalStorageRepository } from "@/repositories/LocalStorageRepository";
import { colorStyles } from "@/theme/colors";
import { motionStyles } from "@/theme/motion";
import { radiusStyles } from "@/theme/radius";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";
const reviewRepository = new LocalStorageRepository();
function DailyReview() {
  const {
    canSubmit,
    draft,
    error,
    isSaving,
    reset,
    result,
    setNotes,
    setRating,
    submit,
  } = useDailyReview(reviewRepository);
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    <PageContainer>
      <div className={spacingStyles.pageStack}>
        <PageHeader
          description="A short capacity check—not a journal. Answer from where you are right now."
          eyebrow="Daily review"
          title="How much attention is available today?"
        />
        <Section
          description="Choose the response that feels closest. There is no ideal score."
          id="capacity-check"
          title="Check in"
        >
          <Card padding="lg">
            <form className={spacingStyles.cardStack} onSubmit={handleSubmit}>
              <EnergySelector
                onChange={(value) => setRating("energy", value)}
                value={draft.energy}
              />
              <Divider />
              <StressSelector
                onChange={(value) => setRating("stress", value)}
                value={draft.stress}
              />
              <Divider />
              <MotivationSelector
                onChange={(value) => setRating("motivation", value)}
                value={draft.motivation}
              />
              <Divider />
              <div>
                <label
                  className={cn(
                    typographyStyles.cardTitle,
                    colorStyles.text.primary,
                  )}
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
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Anything affecting your capacity today?"
                  value={draft.notes}
                />
              </div>
              <div className={cn(spacingStyles.cluster, "items-center")}>
                <Button
                  disabled={!canSubmit || isSaving}
                  size="lg"
                  type="submit"
                >
                  {isSaving ? "Saving…" : "Estimate attention"}
                </Button>
                {result ? (
                  <Button onClick={reset} size="lg" variant="ghost">
                    Start again
                  </Button>
                ) : null}
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
          </Card>
        </Section>
        {result ? (
          <ReviewSummary
            action={
              <ButtonLink href="/" size="lg">
                Generate today&apos;s focus
              </ButtonLink>
            }
            result={result}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}

export { DailyReview };
