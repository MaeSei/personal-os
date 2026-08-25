import type { Task } from "@/domain";
import { formatCalendarDate } from "@/features/projects/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type TaskMetadataProps = { readonly task: Task };

function formatScheduledRange(start: Date, end: Date): string {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Stockholm",
  }).format(start);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
  return `Scheduled ${date}, ${time.format(start)}–${time.format(end)}`;
}

function TaskMetadata({ task }: TaskMetadataProps) {
  const values = [
    task.estimatedDuration ?? task.durationMinutes
      ? `${task.estimatedDuration ?? task.durationMinutes} min estimated`
      : null,
    `Energy ${task.energyCost}/5`,
    task.preferredContext ?? task.context
      ? `Context: ${task.preferredContext ?? task.context}`
      : null,
    task.preferredTime ? `Prefers ${task.preferredTime.toLowerCase()}` : null,
    task.scheduledStart && task.scheduledEnd
      ? formatScheduledRange(task.scheduledStart, task.scheduledEnd)
      : task.scheduledDate
      ? `Scheduled ${formatCalendarDate(task.scheduledDate)}`
      : null,
    task.dueDate ? `Due ${formatCalendarDate(task.dueDate)}` : null,
  ].filter((value): value is string => value !== null);

  return (
    <ul className={cn(spacingStyles.cluster, typographyStyles.description, colorStyles.text.muted)}>
      {values.map((value) => <li key={value}>{value}</li>)}
    </ul>
  );
}

export { TaskMetadata };
