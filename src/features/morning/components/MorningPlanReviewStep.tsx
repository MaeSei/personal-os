import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { MorningStepActions } from "@/features/morning/components/MorningStepActions";
import { formatClockTime, formatDuration } from "@/features/planner/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type MorningPlanReviewStepProps = Pick<
  DailyPlannerData,
  "attention" | "availableTime" | "commitments" | "timeBlocks"
> & {
  readonly disabled: boolean;
  readonly onBack: () => void;
  readonly onStartDay: () => void;
};

function MorningPlanReviewStep(props: MorningPlanReviewStepProps) {
  return (
    <div className={spacingStyles.cardStack}>
      <Section
        description="Nothing changes when you review. Go back to adjust anything, or start when this plan feels realistic."
        id="morning-plan-review"
        title="Does this day feel right?"
      >
        <div className={cn(spacingStyles.cardGrid, "sm:grid-cols-3")}>
          <Card padding="sm">
            <p className={cn(typographyStyles.label, colorStyles.text.muted)}>Attention</p>
            <p className={typographyStyles.cardTitle}>
              {props.attention ? `${props.attention.budget}%` : "Not reviewed"}
            </p>
          </Card>
          <Card padding="sm">
            <p className={cn(typographyStyles.label, colorStyles.text.muted)}>Chosen work</p>
            <p className={typographyStyles.cardTitle}>{props.commitments.length} Tasks</p>
          </Card>
          <Card padding="sm">
            <p className={cn(typographyStyles.label, colorStyles.text.muted)}>Unallocated</p>
            <p className={typographyStyles.cardTitle}>
              {formatDuration(props.availableTime.remainingMinutes)}
            </p>
          </Card>
        </div>
        {props.commitments.length === 0 ? (
          <EmptyState
            description="An empty day is valid. Go back if there is work you intentionally want to include."
            title="No Tasks chosen"
          />
        ) : (
          <Card padding="lg">
            <h3 className={typographyStyles.cardTitle}>Today&apos;s Workspace</h3>
            <ol className={cn("mt-card", spacingStyles.detailStack)}>
              {props.commitments.map((task, index) => (
                <li className="flex items-start gap-cluster" key={task.id}>
                  <Badge variant="neutral">{index + 1}</Badge>
                  <div>
                    <p className={typographyStyles.metricValue}>{task.title}</p>
                    <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
                      {task.area.icon} {task.project?.title ?? task.area.title}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        )}
        <Card padding="lg" tone="subtle">
          <div className="flex items-center justify-between gap-cluster">
            <h3 className={typographyStyles.cardTitle}>Time Blocks</h3>
            <Badge variant="neutral">{props.timeBlocks.length}</Badge>
          </div>
          {props.timeBlocks.length > 0 ? (
            <ul className={cn("mt-card", spacingStyles.detailStack)}>
              {props.timeBlocks.map((block) => (
                <li className="flex flex-wrap justify-between gap-cluster" key={block.id}>
                  <span className={typographyStyles.metricValue}>{block.title}</span>
                  <span className={cn(typographyStyles.description, colorStyles.text.muted)}>
                    {formatClockTime(block.start)}–{formatClockTime(block.end)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={cn("mt-detail", typographyStyles.description, colorStyles.text.muted)}>
              No time has been reserved. Tasks can remain intentionally unscheduled.
            </p>
          )}
        </Card>
      </Section>
      <MorningStepActions
        disabled={props.disabled}
        nextLabel="Start day"
        onBack={props.onBack}
        onNext={props.onStartDay}
      />
    </div>
  );
}

export { MorningPlanReviewStep };
