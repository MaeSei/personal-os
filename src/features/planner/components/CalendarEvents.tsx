import { Badge } from "@/components/ui/Badge";
import type { DailyPlannerData } from "@/features/contracts/PlannerFeature";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type CalendarEventsProps = Pick<DailyPlannerData, "calendar">;

function formatEventTime(
  event: DailyPlannerData["calendar"]["events"][number],
  timeZone: string,
): string {
  if (event.allDay) return "All day";
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  return `${formatter.format(event.start)}–${formatter.format(event.end)}`;
}

function CalendarEvents({ calendar }: CalendarEventsProps) {
  return (
    <div className={spacingStyles.detailStack}>
      <Badge variant="neutral">
        {calendar.connected ? "Read-only" : "Not connected"}
      </Badge>
      <h3 className={typographyStyles.cardTitle}>Calendar Events</h3>
      <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
        {calendar.message}
      </p>
      {calendar.events.length > 0 ? (
        <ol className={cn("divide-y", colorStyles.itemList)}>
          {calendar.events.map((event) => (
            <li className="py-detail first:pt-0 last:pb-0" key={event.id}>
              <div className="flex items-baseline justify-between gap-cluster">
                <p className={typographyStyles.metricLabel}>{event.title}</p>
                <time
                  className={cn(typographyStyles.metricValue, colorStyles.text.muted)}
                  dateTime={event.start.toISOString()}
                >
                  {formatEventTime(event, calendar.timeZone)}
                </time>
              </div>
              {event.location ? (
                <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
                  {event.location}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export { CalendarEvents };
