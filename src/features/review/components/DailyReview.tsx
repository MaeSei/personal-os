"use client";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { DailyReviewForm } from "@/features/review/components/DailyReviewForm";
import { ReviewSummary } from "@/features/review/components/ReviewSummary";
import { useDailyReview } from "@/features/review/hooks/useDailyReview";
import { useFeatures } from "@/features/FeatureProvider";
import { spacingStyles } from "@/theme/spacing";

function DailyReview() {
  const { review } = useFeatures();
  const {
    canSubmit,
    draft,
    error,
    isSaving,
    result,
    setNotes,
    setRating,
    submit,
  } = useDailyReview(review);
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
            <DailyReviewForm
              canSubmit={canSubmit}
              draft={draft}
              error={error}
              isSaving={isSaving}
              onNotesChange={setNotes}
              onRatingChange={setRating}
              onSubmit={() => void submit()}
            />
          </Card>
        </Section>
        {result ? (
          <ReviewSummary
            action={
              <ButtonLink href="/morning" size="lg">
                Continue morning planning
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
