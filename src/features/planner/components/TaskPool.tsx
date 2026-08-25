import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { PlannerTask } from "@/features/contracts/PlannerFeature";
import { PlannerTaskCard } from "@/features/planner/components/PlannerTaskCard";
import { cn } from "@/lib/cn";
import { spacingStyles } from "@/theme/spacing";

type TaskPoolProps = {
  readonly disabled: boolean;
  readonly onPlace: (taskId: string) => void;
  readonly tasks: readonly PlannerTask[];
};

function TaskPool({ disabled, onPlace, tasks }: TaskPoolProps) {
  return (
    <Section
      action={<ButtonLink href="/projects" size="sm" variant="secondary">Open Projects</ButtonLink>}
      description="Available Project actions and standalone Tasks. Drag one into today's order or add it directly."
      id="task-pool"
      title="Task Pool"
    >
      {tasks.length === 0 ? (
        <EmptyState
          action={<ButtonLink href="/projects" size="sm" variant="secondary">Review Projects</ButtonLink>}
          description="Create an actionable Task or process Inbox when new work appears."
          title="No available Tasks"
        />
      ) : (
        <div className={cn(spacingStyles.cardGrid, "lg:grid-cols-2")}>
          {tasks.map((task) => (
            <PlannerTaskCard disabled={disabled} key={task.id} onAdd={() => onPlace(task.id)} task={task} />
          ))}
        </div>
      )}
    </Section>
  );
}

export { TaskPool };
