import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { WorkspaceCapacity } from "@/features/planner/components/WorkspaceCapacity";
import { formatClockTime, formatDuration } from "@/features/planner/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type AvailableTimeProps = Pick<
  DailyPlannerData,
  "attention" | "availableSlots" | "availableTime"
>;

function AvailableTime(props: AvailableTimeProps) {
  return (
    <Section
      description="Calendar commitments, working hours, and Atlas reservations define the room you can choose to use."
      id="available-time"
      title="How much room is available?"
    >
      <Card padding="lg">
        <WorkspaceCapacity {...props} />
      </Card>
      {props.availableSlots.length === 0 ? (
        <EmptyState
          description="Your working window is already occupied. You can still choose Tasks without assigning them a time."
          title="No open time remains"
        />
      ) : (
        <div className={cn(spacingStyles.cardGrid, "sm:grid-cols-2 lg:grid-cols-3")}>
          {props.availableSlots.map((slot) => (
            <Card key={`${slot.start}-${slot.end}`} padding="sm" tone="subtle">
              <p className={cn(typographyStyles.cardTitle, colorStyles.text.primary)}>
                {formatClockTime(slot.start)}–{formatClockTime(slot.end)}
              </p>
              <p className={cn(typographyStyles.description, colorStyles.text.accent)}>
                {formatDuration(slot.duration)} available
              </p>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}

export { AvailableTime };
