import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ProjectBreakdownPreview as Preview } from "@/features/contracts/AssistantFeature";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type ProjectBreakdownPreviewProps = {
  readonly disabled: boolean;
  readonly onMilestoneChange: (id: string, selected: boolean) => void;
  readonly onTaskChange: (id: string, selected: boolean) => void;
  readonly preview: Preview;
  readonly selectedMilestones: ReadonlySet<string>;
  readonly selectedTasks: ReadonlySet<string>;
};

function ProjectBreakdownPreview(props: ProjectBreakdownPreviewProps) {
  return (
    <div className={spacingStyles.cardStack}>
      <p className={cn(typographyStyles.body, colorStyles.text.primary)}>
        {props.preview.proposal.summary}
      </p>
      {props.preview.proposal.milestones.length > 0 ? (
        <div className={spacingStyles.detailStack}>
          <h4 className={typographyStyles.cardTitle}>Milestones</h4>
          {props.preview.proposal.milestones.map((milestone) => (
            <label className="block" key={milestone.id}>
            <Card padding="sm" tone="subtle">
              <span className="flex items-start gap-cluster">
                <input
                  checked={props.selectedMilestones.has(milestone.id)}
                  className="mt-1 size-4 accent-accent"
                  disabled={props.disabled}
                  onChange={(event) => props.onMilestoneChange(milestone.id, event.target.checked)}
                  type="checkbox"
                />
                <span className={spacingStyles.detailStack}>
                  <span className={typographyStyles.metricValue}>{milestone.title}</span>
                  <span className={cn(typographyStyles.description, colorStyles.text.muted)}>
                    {milestone.reason}
                  </span>
                </span>
              </span>
            </Card>
            </label>
          ))}
        </div>
      ) : null}
      <div className={spacingStyles.detailStack}>
        <h4 className={typographyStyles.cardTitle}>Tasks</h4>
        {props.preview.proposal.tasks.map((task) => (
          <label className="block" key={task.id}>
          <Card padding="sm">
            <span className="flex items-start gap-cluster">
              <input
                checked={props.selectedTasks.has(task.id)}
                className="mt-1 size-4 accent-accent"
                disabled={props.disabled}
                onChange={(event) => props.onTaskChange(task.id, event.target.checked)}
                type="checkbox"
              />
              <span className={cn("min-w-0 flex-1", spacingStyles.detailStack)}>
                <span className="flex flex-wrap items-center gap-cluster">
                  <span className={typographyStyles.metricValue}>{task.title}</span>
                  {task.estimatedDurationMinutes ? <Badge variant="neutral">{task.estimatedDurationMinutes} min</Badge> : null}
                  {task.energy ? <Badge variant="neutral">Energy {task.energy}/5</Badge> : null}
                </span>
                <span className={cn(typographyStyles.description, colorStyles.text.muted)}>
                  {task.reason}
                </span>
                {task.dependencies.length > 0 ? (
                  <span className={cn(typographyStyles.description, colorStyles.text.muted)}>
                    Depends on {task.dependencies.length} proposed {task.dependencies.length === 1 ? "Task" : "Tasks"}
                  </span>
                ) : null}
              </span>
            </span>
          </Card>
          </label>
        ))}
      </div>
    </div>
  );
}

export { ProjectBreakdownPreview };
