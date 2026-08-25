"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageStatus } from "@/components/ui/PageStatus";
import { MorningAvailabilityStep } from "@/features/morning/components/MorningAvailabilityStep";
import { MorningCalendarStep } from "@/features/morning/components/MorningCalendarStep";
import { MorningPlanReviewStep } from "@/features/morning/components/MorningPlanReviewStep";
import { MorningProgress } from "@/features/morning/components/MorningProgress";
import { MorningReviewStep } from "@/features/morning/components/MorningReviewStep";
import { MorningSessionActions } from "@/features/morning/components/MorningSessionActions";
import { MorningStartedStep } from "@/features/morning/components/MorningStartedStep";
import { MorningTimeBlocksStep } from "@/features/morning/components/MorningTimeBlocksStep";
import { MorningWorkspaceStep } from "@/features/morning/components/MorningWorkspaceStep";
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
            <MorningSessionActions
              disabled={planning.isSaving}
              hasDraft={data.plan.persisted}
              onDiscard={workflow.discardDraft}
              onResumeLater={workflow.resumeLater}
              onSave={workflow.saveDraft}
            />
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
        {stage === "calendar" ? (
          <MorningCalendarStep calendar={data.calendar} onBack={data.attention ? undefined : () => workflow.setStage("review")} onNext={() => workflow.setStage("availability")} />
        ) : null}
        {stage === "availability" ? (
          <MorningAvailabilityStep {...data} onBack={() => workflow.setStage("calendar")} onNext={() => workflow.setStage("workspace")} />
        ) : null}
        {stage === "workspace" ? (
          <MorningWorkspaceStep {...data} disabled={planning.isSaving} onBack={() => workflow.setStage("availability")} onMove={planning.moveTask} onNext={() => workflow.setStage("timeBlocks")} onPlace={planning.placeTask} onRemove={planning.removeTask} onSchedule={planning.scheduleTaskInSlot} onUnschedule={planning.unscheduleTask} />
        ) : null}
        {stage === "timeBlocks" ? (
          <MorningTimeBlocksStep onBack={() => workflow.setStage("workspace")} onNext={() => workflow.setStage("confirm")} planning={planning} />
        ) : null}
        {stage === "confirm" ? (
          <MorningPlanReviewStep {...data} disabled={planning.isSaving} onBack={() => workflow.setStage("timeBlocks")} onStartDay={() => void workflow.startDay()} />
        ) : null}
        {stage === "started" ? <MorningStartedStep commitments={data.commitments} timeBlocks={data.timeBlocks} /> : null}
      </div>
    </PageContainer>
  );
}

export { MorningWorkflow };
