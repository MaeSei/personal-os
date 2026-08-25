import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { DailyReviewForm } from "@/features/review/components/DailyReviewForm";
import type { useDailyReview } from "@/features/review/hooks/useDailyReview";

type MorningReviewStepProps = {
  readonly onComplete: () => void;
  readonly onSkip: () => void;
  readonly review: ReturnType<typeof useDailyReview>;
};

function MorningReviewStep({
  onComplete,
  onSkip,
  review,
}: MorningReviewStepProps) {
  return (
    <Section
      description="Three quick signals help Atlas estimate capacity. You can skip and plan manually."
      id="morning-review"
      title="How are you arriving today?"
    >
      <Card padding="lg">
        <DailyReviewForm
          canSubmit={review.canSubmit}
          draft={review.draft}
          error={review.error}
          isSaving={review.isSaving}
          onNotesChange={review.setNotes}
          onRatingChange={review.setRating}
          onSubmit={onComplete}
          secondaryAction={
            <Button onClick={onSkip} size="lg" variant="ghost">
              Skip check-in
            </Button>
          }
        />
      </Card>
    </Section>
  );
}

export { MorningReviewStep };
