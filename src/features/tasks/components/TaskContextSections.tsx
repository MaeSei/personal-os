import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { TaskDependency, TaskNote } from "@/features/contracts/TaskFeature";
import { TaskStatusBadge } from "@/features/tasks/components/TaskStatusBadge";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type TaskContextSectionsProps = {
  readonly dependencies: readonly TaskDependency[];
  readonly notes: readonly TaskNote[];
};

function TaskContextSections({ dependencies, notes }: TaskContextSectionsProps) {
  return (
    <div className={cn(spacingStyles.cardGrid, "lg:grid-cols-2")}>
      <Section
        description="Work that must move before this Task can."
        id="task-dependencies"
        title="Dependencies"
      >
        {dependencies.length === 0 ? (
          <EmptyState
            description="This Task is ready to stand on its own."
            title="No dependencies"
          />
        ) : (
          <Card padding="none">
            <ul className={cn(spacingStyles.itemList, colorStyles.itemList)}>
              {dependencies.map((dependency) => (
                <li className={spacingStyles.item} key={dependency.id}>
                  <a
                    className={cn(
                      "flex w-full items-center justify-between gap-card",
                      colorStyles.focusRing,
                    )}
                    href={`/tasks/${dependency.id}`}
                  >
                    <span className={typographyStyles.metricLabel}>
                      {dependency.title}
                    </span>
                    <TaskStatusBadge status={dependency.status} />
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>
      <Section
        description="Supporting context kept with this Task."
        id="task-notes"
        title="Notes"
      >
        {notes.length === 0 ? (
          <EmptyState
            description="Dedicated Task notes are not in the current data model."
            title="No notes"
          />
        ) : (
          <Card padding="none">
            <ul className={cn(spacingStyles.itemList, colorStyles.itemList)}>
              {notes.map((note) => (
                <li className={spacingStyles.item} key={note.id}>
                  <p className={typographyStyles.body}>{note.body}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>
    </div>
  );
}

export { TaskContextSections };
