import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/ui/PageContainer";
import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { DayPlanActions } from "@/features/planner/components/DayPlanActions";
import { MorningSummary } from "@/features/planner/components/MorningSummary";
import { PlannerFeedback } from "@/features/planner/components/PlannerFeedback";
import { PlanningWorkspace } from "@/features/planner/components/PlanningWorkspace";
import { QuickCaptureSection } from "@/features/planner/components/QuickCaptureSection";
import type { TimeBlockActions } from "@/features/planner/components/TimeBlockActions";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type DailyPlannerProps = TimeBlockActions & {
  readonly announcement: string;
  readonly data: DailyPlannerData;
  readonly disabled: boolean;
  readonly error: string | null;
  readonly initialTaskId?: string | null;
  readonly onMoveTask: (taskId: string, direction: "down" | "up") => Promise<boolean>;
  readonly onPlaceTask: (taskId: string, beforeTaskId?: string | null) => Promise<boolean>;
  readonly onPlaceTasks: (taskIds: readonly string[]) => Promise<boolean>;
  readonly onRemoveTask: (taskId: string) => Promise<boolean>;
  readonly onSaveDraft: () => void;
  readonly onStartDay: () => void;
  readonly onUnscheduleTask: (taskId: string) => void;
};

function DailyPlanner(props: DailyPlannerProps) {
  const { announcement, data, error } = props;
  return (
    <PageContainer>
      <div className={spacingStyles.pageStack}>
        <MorningSummary {...data.morning} />
        {error ? <Card role="alert" tone="danger"><p className={typographyStyles.description}>{error}</p></Card> : null}
        <PlannerFeedback announcement={announcement} isSaving={props.disabled} />
        <PlanningWorkspace {...props} />
        <DayPlanActions
          disabled={props.disabled}
          onSaveDraft={props.onSaveDraft}
          onStartDay={props.onStartDay}
          persisted={data.plan.persisted}
          status={data.plan.status}
        />
        <QuickCaptureSection inboxCount={data.morning.inboxCount} />
      </div>
    </PageContainer>
  );
}

export { DailyPlanner };
