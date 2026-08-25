import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { DailyWrapUpData } from "@/features/contracts/WrapUpFeature";
import { CalendarEvents } from "@/features/planner/components/CalendarEvents";
import { formatClockTime } from "@/features/planner/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type WrapUpScheduleEvidenceProps = Pick<DailyWrapUpData, "calendar" | "timeBlocks">;

function WrapUpScheduleEvidence(props: WrapUpScheduleEvidenceProps) {
  return (
    <Section
      description="Calendar is read-only evidence. Time Blocks show intention, not proof that work happened."
      id="wrap-up-schedule"
      title="What shaped the day?"
    >
      <div className={cn(spacingStyles.cardGrid, "lg:grid-cols-2")}>
        <Card padding="lg">
          <div className="flex items-center justify-between gap-cluster">
            <h3 className={typographyStyles.cardTitle}>Time Blocks</h3>
            <Badge variant="neutral">{props.timeBlocks.length}</Badge>
          </div>
          {props.timeBlocks.length === 0 ? (
            <div className="mt-card">
              <EmptyState
                description="No Atlas reservations were made for today."
                title="No Time Blocks"
              />
            </div>
          ) : (
            <ul className={cn("mt-card", spacingStyles.detailStack)}>
              {props.timeBlocks.map((block) => (
                <li className="flex flex-wrap justify-between gap-cluster" key={block.id}>
                  <div>
                    <p className={typographyStyles.metricValue}>{block.title}</p>
                    <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
                      {block.type}{block.linkedTaskTitles.length > 0
                        ? ` · ${block.linkedTaskTitles.join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <span className={cn(typographyStyles.metricValue, colorStyles.text.muted)}>
                    {formatClockTime(block.start)}–{formatClockTime(block.end)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card padding="lg" tone="subtle">
          <CalendarEvents calendar={props.calendar} />
        </Card>
      </div>
    </Section>
  );
}

export { WrapUpScheduleEvidence };
