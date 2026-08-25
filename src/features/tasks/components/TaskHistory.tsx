import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import type { TaskHistoryEntry } from "@/features/contracts/TaskFeature";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type TaskHistoryProps = { readonly entries: readonly TaskHistoryEntry[] };

const labels: Record<TaskHistoryEntry["kind"], string> = {
  completed: "Completed",
  created: "Created",
  updated: "Updated",
};

function formatHistoryDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function TaskHistory({ entries }: TaskHistoryProps) {
  const isCompleted = entries.some((entry) => entry.kind === "completed");

  return (
    <Section
      description="A compact lifecycle record for this Task."
      id="task-history"
      title="History"
    >
      <Card padding="none">
        <ol className={cn(spacingStyles.itemList, colorStyles.itemList)}>
          {entries.map((entry, index) => (
            <li className={spacingStyles.item} key={`${entry.kind}-${index}`}>
              <div className="flex w-full items-baseline justify-between gap-card">
                <span className={typographyStyles.metricLabel}>{labels[entry.kind]}</span>
                <time className={cn(typographyStyles.description, colorStyles.text.muted)} dateTime={entry.at.toISOString()}>
                  {formatHistoryDate(entry.at)}{entry.approximate ? " (best available time)" : ""}
                </time>
              </div>
            </li>
          ))}
          {!isCompleted ? (
            <li className={spacingStyles.item}>
              <div className="flex w-full items-baseline justify-between gap-card">
                <span className={typographyStyles.metricLabel}>Completed</span>
                <span className={cn(typographyStyles.description, colorStyles.text.muted)}>
                  Not completed
                </span>
              </div>
            </li>
          ) : null}
        </ol>
      </Card>
    </Section>
  );
}

export { TaskHistory };
