import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { Task } from "@/domain";
import { TaskMetadata } from "@/features/tasks/components/TaskMetadata";
import { TaskStatusBadge } from "@/features/tasks/components/TaskStatusBadge";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type TaskCollectionProps = {
  readonly description: string;
  readonly emptyMessage: string;
  readonly id: string;
  readonly tasks: readonly Task[];
  readonly title: string;
};

function TaskCollection({ description, emptyMessage, id, tasks, title }: TaskCollectionProps) {
  return (
    <Section description={description} id={id} title={title}>
      {tasks.length === 0 ? (
        <EmptyState description={emptyMessage} title={`No ${title.toLowerCase()}`} />
      ) : (
        <Card padding="none">
          <ul className={cn(spacingStyles.itemList, colorStyles.itemList)}>
            {tasks.map((task) => (
              <li className={spacingStyles.item} key={task.id}>
                <div className={spacingStyles.detailStack}>
                  <div className={spacingStyles.cluster}>
                    <h3 className={typographyStyles.itemTitle}>{task.title}</h3>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  <TaskMetadata task={task} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Section>
  );
}

export { TaskCollection };
