import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PlannerTask } from "@/features/contracts/PlannerFeature";
import { PlannerTaskCard } from "@/features/planner/components/PlannerTaskCard";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type WorkspaceTaskPoolProps = {
  readonly disabled: boolean;
  readonly isFiltering?: boolean;
  readonly onAdd: (taskId: string) => void;
  readonly onAddSelected: () => void;
  readonly onClearSelection: () => void;
  readonly onSelect: (taskId: string, selected: boolean) => void;
  readonly selectedIds: ReadonlySet<string>;
  readonly tasks: readonly PlannerTask[];
};

function WorkspaceTaskPool(props: WorkspaceTaskPoolProps) {
  const selectedCount = props.tasks.filter(({ id }) => props.selectedIds.has(id)).length;

  return (
    <div className={spacingStyles.cardStack}>
      {selectedCount > 0 ? (
        <div className={cn("rounded-control bg-accent-soft p-card-compact", spacingStyles.detailStack)}>
          <p className={cn(typographyStyles.metricLabel, colorStyles.text.accent)}>
            {selectedCount} selected
          </p>
          <div className={spacingStyles.cluster}>
            <Button disabled={props.disabled} onClick={props.onAddSelected} size="sm">
              Add selected
            </Button>
            <Button disabled={props.disabled} onClick={props.onClearSelection} size="sm" variant="ghost">
              Clear
            </Button>
          </div>
        </div>
      ) : null}
      {props.tasks.length === 0 ? (
        <EmptyState
          action={<ButtonLink href="/projects" size="sm" variant="secondary">Review Projects</ButtonLink>}
          description={props.isFiltering
            ? "Try a broader search or clear the query."
            : "Create an actionable Task or return work from today's plan."}
          title={props.isFiltering ? "No matching Tasks" : "No available Tasks"}
        />
      ) : (
        <div className={spacingStyles.cardStack}>
          {props.tasks.map((task) => (
            <PlannerTaskCard
              disabled={props.disabled}
              key={task.id}
              onAdd={() => props.onAdd(task.id)}
              onSelect={(selected) => props.onSelect(task.id, selected)}
              selected={props.selectedIds.has(task.id)}
              task={task}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export { WorkspaceTaskPool };
