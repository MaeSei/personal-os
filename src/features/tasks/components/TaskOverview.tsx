import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import type { TaskDetailData } from "@/features/contracts/TaskFeature";
import { getTaskContexts, getTaskEstimate } from "@/domain";
import { formatCalendarDate } from "@/features/projects/presentation";
import { formatScheduledRange } from "@/features/tasks/components/TaskMetadata";
import { TaskStatusBadge } from "@/features/tasks/components/TaskStatusBadge";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type TaskOverviewProps = { readonly data: TaskDetailData };

function TaskOverview({ data }: TaskOverviewProps) {
  const { area, project, task } = data;
  const contexts = getTaskContexts(task);
  const estimate = getTaskEstimate(task);
  const scheduled = task.scheduledStart && task.scheduledEnd
    ? formatScheduledRange(task.scheduledStart, task.scheduledEnd).replace(
        "Scheduled ",
        "",
      )
    : task.scheduledDate
      ? formatCalendarDate(task.scheduledDate)
      : "Not scheduled";
  const facts: readonly [string, ReactNode][] = [
    [
      "Project",
      project ? (
        <a
          className={cn(colorStyles.text.accent, colorStyles.focusRing)}
          href={`/projects/${project.id}`}
          key="project"
        >
          {project.title}
        </a>
      ) : "Standalone Task",
    ],
    ["Area", area ? `${area.icon} ${area.title}` : "Area unavailable"],
    ["Outcome", project?.outcome ?? "No Project outcome"],
    [
      "Duration",
      estimate.durationMinutes
        ? `${estimate.durationMinutes} minutes`
        : "Not estimated",
    ],
    ["Effort", `${estimate.effort} of 5`],
    ["Energy", `${estimate.energy} of 5`],
    ["Confidence", estimate.confidence ?? "Not assessed"],
    ["Contexts", contexts.length > 0 ? contexts.join(", ") : "Anywhere"],
    ["Status", <TaskStatusBadge key="status" status={task.status} />],
    ["Due", task.dueDate ? formatCalendarDate(task.dueDate) : "No due date"],
    ["Scheduled", scheduled],
  ];

  return (
    <Card as="article" padding="lg">
      <div className={spacingStyles.cardStack}>
        <p className={cn(typographyStyles.lead, colorStyles.text.muted)}>
          {task.description ?? "No description yet."}
        </p>
        <dl className="grid gap-card border-t border-border pt-card sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(([label, value]) => (
            <div className={spacingStyles.detailStack} key={label}>
              <dt className={cn(typographyStyles.label, colorStyles.text.muted)}>
                {label}
              </dt>
              <dd className={cn(typographyStyles.body, colorStyles.text.primary)}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}

export { TaskOverview };
