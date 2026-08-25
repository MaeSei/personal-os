import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { CalendarEvents } from "@/features/planner/components/CalendarEvents";
import { formatDuration } from "@/features/planner/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type AvailableTimeProps = Pick<DailyPlannerData, "availableTime" | "calendar">;

function AvailableTime({ availableTime, calendar }: AvailableTimeProps) {
  return (
    <Section
      description="An eight-hour planning window minus the blocks you explicitly create."
      id="available-time"
      title="Today's Available Time"
    >
      <div className={cn(spacingStyles.cardGrid, "md:grid-cols-2")}>
        <Card>
          <p className={cn(typographyStyles.metric, colorStyles.text.accent)}>{formatDuration(availableTime.remainingMinutes)}</p>
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>Unallocated of {formatDuration(availableTime.totalMinutes)}</p>
          <p className={cn("mt-card", typographyStyles.metricValue, colorStyles.text.primary)}>{formatDuration(availableTime.plannedMinutes)} time-boxed</p>
        </Card>
        <Card tone="subtle">
          <CalendarEvents calendar={calendar} />
        </Card>
      </div>
    </Section>
  );
}

export { AvailableTime };
