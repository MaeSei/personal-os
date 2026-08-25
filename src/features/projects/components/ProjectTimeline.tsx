import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { ProjectTimelineEntry } from "@/domain";
import { formatCalendarDate } from "@/features/projects/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type ProjectTimelineProps = { readonly entries: readonly ProjectTimelineEntry[] };

function ProjectTimeline({ entries }: ProjectTimelineProps) {
  return (
    <Section description="Scheduled intentions and due dates in chronological order." id="project-timeline" title="Timeline">
      {entries.length === 0 ? (
        <EmptyState description="Add a scheduled or due date when timing becomes important." title="No dated work yet" />
      ) : (
        <Card padding="none">
          <ol className={cn(spacingStyles.itemList, colorStyles.itemList)}>
            {entries.map((entry) => (
              <li className={spacingStyles.item} key={`${entry.task.id}-${entry.kind}-${entry.date}`}>
                <time className={cn(typographyStyles.metricLabel, colorStyles.text.accent)} dateTime={entry.date}>{formatCalendarDate(entry.date)}</time>
                <div className={spacingStyles.detailStack}>
                  <p className={typographyStyles.itemTitle}>{entry.task.title}</p>
                  <p className={cn(typographyStyles.description, colorStyles.text.muted)}>{entry.kind === "due" ? "Due" : "Scheduled"}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </Section>
  );
}

export { ProjectTimeline };
