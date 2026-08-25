import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { WrapUpTaskEvidence } from "@/features/contracts/WrapUpFeature";
import { formatDuration } from "@/features/planner/presentation";
import { formatActualDuration } from "@/features/wrap-up/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type WrapUpTaskListProps = {
  readonly carryForwardTaskIds?: readonly string[];
  readonly emptyDescription: string;
  readonly emptyTitle: string;
  readonly onCarryForward?: (taskId: string, selected: boolean) => void;
  readonly tasks: readonly WrapUpTaskEvidence[];
};

function WrapUpTaskList(props: WrapUpTaskListProps) {
  if (props.tasks.length === 0) {
    return <EmptyState description={props.emptyDescription} title={props.emptyTitle} />;
  }
  return (
    <div className={spacingStyles.detailStack}>
      {props.tasks.map((task) => {
        const selected = props.carryForwardTaskIds?.includes(task.id) ?? false;
        return (
          <Card as="article" key={task.id} padding="sm" tone={task.completed ? "accent" : "default"}>
            <div className="flex flex-col items-start justify-between gap-card sm:flex-row">
              <div className={spacingStyles.detailStack}>
                <div className={spacingStyles.cluster}>
                  <h3 className={typographyStyles.cardTitle}>{task.title}</h3>
                  <Badge variant={task.completed ? "success" : "neutral"}>
                    {task.completed ? "Completed" : "Unfinished"}
                  </Badge>
                </div>
                {task.projectTitle ? (
                  <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
                    {task.projectTitle}
                  </p>
                ) : null}
                <p className={cn(typographyStyles.metricValue, colorStyles.text.muted)}>
                  Estimate {task.estimatedDurationMinutes
                    ? formatDuration(task.estimatedDurationMinutes)
                    : "not set"}
                  {" · "}Actual {formatActualDuration(task.actualDurationSeconds)}
                </p>
              </div>
              {props.onCarryForward ? (
                <label className={cn("flex cursor-pointer items-center gap-detail", colorStyles.focusRing)}>
                  <input
                    checked={selected}
                    className="size-4 accent-accent"
                    onChange={(event) => props.onCarryForward?.(task.id, event.target.checked)}
                    type="checkbox"
                  />
                  <span className={typographyStyles.metricLabel}>Carry to tomorrow</span>
                </label>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export { WrapUpTaskList };
