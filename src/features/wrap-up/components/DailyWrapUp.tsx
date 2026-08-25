"use client";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageStatus } from "@/components/ui/PageStatus";
import { Section } from "@/components/ui/Section";
import { useFeatures } from "@/features/FeatureProvider";
import { WrapUpComplete } from "@/features/wrap-up/components/WrapUpComplete";
import { WrapUpForm } from "@/features/wrap-up/components/WrapUpForm";
import { WrapUpMetrics } from "@/features/wrap-up/components/WrapUpMetrics";
import { WrapUpScheduleEvidence } from "@/features/wrap-up/components/WrapUpScheduleEvidence";
import { WrapUpTaskList } from "@/features/wrap-up/components/WrapUpTaskList";
import { useDailyWrapUp } from "@/features/wrap-up/hooks/useDailyWrapUp";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

function DailyWrapUp() {
  const { wrapUp } = useFeatures();
  const state = useDailyWrapUp(wrapUp);
  if (state.isLoading && !state.data) {
    return (
      <PageStatus
        description="Reading today's plan, Focus Sessions, and Calendar."
        title="Preparing Daily Wrap-Up"
      />
    );
  }
  if (!state.data) {
    return (
      <PageStatus
        action={<Button onClick={() => void state.load()}>Try again</Button>}
        description={state.error ?? "Atlas could not prepare the Daily Wrap-Up."}
        title="Daily Wrap-Up is unavailable"
        tone="danger"
      />
    );
  }
  const data = state.data;
  return (
    <PageContainer>
      <div className={spacingStyles.pageStack}>
        <PageHeader
          action={<ButtonLink href="/" variant="secondary">Workspace</ButtonLink>}
          description="Compare intention with what happened, decide unfinished work, and leave the day without a productivity score."
          eyebrow={data.dateLabel}
          title={`Close the day, ${data.name}.`}
        />
        {data.review ? (
          <WrapUpComplete review={data.review} />
        ) : (
          <>
            <WrapUpMetrics metrics={data.metrics} />
            <Section
              description="Completion is taken from current Task status. Recorded time comes only from Atlas Focus Sessions."
              id="wrap-up-work"
              title="What moved?"
            >
              <div className="grid items-start gap-card lg:grid-cols-2">
                <div className={spacingStyles.detailStack}>
                  <h3 className={typographyStyles.cardTitle}>Completed Tasks</h3>
                  <WrapUpTaskList
                    emptyDescription="No planned Tasks are marked complete. That is evidence, not a grade."
                    emptyTitle="Nothing recorded as completed"
                    tasks={data.completedTasks}
                  />
                </div>
                <div className={spacingStyles.detailStack}>
                  <h3 className={typographyStyles.cardTitle}>Incomplete Tasks</h3>
                  <WrapUpTaskList
                    carryForwardTaskIds={state.carryForwardTaskIds}
                    emptyDescription="Every planned Task is currently complete."
                    emptyTitle="No unfinished Tasks"
                    onCarryForward={state.setCarryForward}
                    tasks={data.incompleteTasks}
                  />
                </div>
              </div>
            </Section>
            <WrapUpScheduleEvidence calendar={data.calendar} timeBlocks={data.timeBlocks} />
            <Section
              description="Answer from the shape of the day. Notes are stored, but Atlas does not analyse or coach from them yet."
              id="wrap-up-reflection"
              title="How did it go?"
            >
              <WrapUpForm
                canSubmit={state.canSubmit}
                carryForwardCount={state.carryForwardTaskIds.length}
                error={state.error}
                estimateAssessment={state.estimateAssessment}
                isSaving={state.isSaving}
                notes={state.notes}
                onEstimateAssessmentChange={state.setEstimateAssessment}
                onNotesChange={state.setNotes}
                onPlanAssessmentChange={state.setPlanAssessment}
                onSubmit={() => void state.complete()}
                planAssessment={state.planAssessment}
              />
            </Section>
          </>
        )}
      </div>
    </PageContainer>
  );
}

export { DailyWrapUp };
