"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageStatus } from "@/components/ui/PageStatus";
import { MorningAdjustmentStep } from "@/features/morning/components/MorningAdjustmentStep";
import { MorningAttentionStep } from "@/features/morning/components/MorningAttentionStep";
import { MorningCalendarStep } from "@/features/morning/components/MorningCalendarStep";
import { MorningProgress } from "@/features/morning/components/MorningProgress";
import { MorningReviewStep } from "@/features/morning/components/MorningReviewStep";
import { MorningStartedStep } from "@/features/morning/components/MorningStartedStep";
import { MorningSuggestionsStep } from "@/features/morning/components/MorningSuggestionsStep";
import { useMorningWorkflow } from "@/features/morning/hooks/useMorningWorkflow";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

function MorningWorkflow() {
  const workflow = useMorningWorkflow();
  const { planning, stage } = workflow;

  if (planning.isLoading && !planning.data) {
    return <PageStatus description="Gathering today's review, calendar, and work." title="Preparing your morning" />;
  }
  if (!planning.data || !stage) {
    return (
      <PageStatus
        action={<Button onClick={() => void planning.reload()}>Try again</Button>}
        description={planning.error ?? "Atlas could not prepare Morning Planning."}
        title="Morning Planning is unavailable"
        tone="danger"
      />
    );
  }

  const data = planning.data;
  return (
    <PageContainer>
      <div className={spacingStyles.pageStack}>
        <PageHeader
          action={stage === "started" ? undefined : (
            <>
              <Button onClick={workflow.skipForNow} variant="ghost">Skip for now</Button>
              {stage !== "review" ? (
                <Button disabled={planning.isSaving} onClick={() => void workflow.saveAndLeave()} variant="secondary">
                  Save draft and leave
                </Button>
              ) : null}
            </>
          )}
          description="Move from capacity and fixed commitments to a day you have intentionally chosen."
          eyebrow={data.morning.dateLabel}
          title={stage === "started" ? "The day is yours." : `Good morning, ${data.morning.name}.`}
        />
        {stage !== "started" ? <MorningProgress current={stage} /> : null}
        {planning.error ? <Card role="alert" tone="danger"><p className={typographyStyles.description}>{planning.error}</p></Card> : null}
        <p aria-live="polite" className={typographyStyles.description} role="status">{planning.announcement}</p>
        {stage === "review" ? (
          <MorningReviewStep
            onComplete={() => void workflow.completeReview()}
            onSkip={() => workflow.setStage("calendar")}
            review={workflow.checkIn}
          />
        ) : null}
        {stage === "attention" ? (
          <MorningAttentionStep attention={data.attention} onBack={() => workflow.setStage("review")} onNext={() => workflow.setStage("calendar")} />
        ) : null}
        {stage === "calendar" ? (
          <MorningCalendarStep calendar={data.calendar} onBack={() => workflow.setStage(data.attention ? "attention" : "review")} onNext={() => workflow.setStage("suggestions")} />
        ) : null}
        {stage === "suggestions" ? (
          <MorningSuggestionsStep {...data} disabled={planning.isSaving} onBack={() => workflow.setStage("calendar")} onMove={planning.moveTask} onNext={() => workflow.setStage("adjustments")} onPlace={planning.placeTask} onRemove={planning.removeTask} onUnschedule={planning.unscheduleTask} />
        ) : null}
        {stage === "adjustments" ? <MorningAdjustmentStep onStartDay={() => void workflow.startDay()} planning={planning} /> : null}
        {stage === "started" ? <MorningStartedStep commitments={data.commitments} timeBlocks={data.timeBlocks} /> : null}
      </div>
    </PageContainer>
  );
}

export { MorningWorkflow };
