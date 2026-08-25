import type { CalendarProvider } from "../calendar";
import type { AnalyticsReportProvider } from "./AnalyticsService";
import type { PatternProvider } from "./PatternService";
import {
  AvailabilityService,
  generateRecommendations,
  isProject,
  isTask,
  type CalendarDate,
  type DailyTimeRange,
  type Item,
  type Recommendation,
} from "../domain";
import type { DailyReviewRepository } from "../repositories/DailyReviewRepository";
import type { ItemRepository } from "../repositories/ItemRepository";

const DEFAULT_WORKING_HOURS: readonly DailyTimeRange[] = [{
  end: 17 * 60,
  start: 9 * 60,
}];

type RecommendationContext = {
  readonly now?: Date;
  readonly timeZone: string;
  readonly workingHours?: readonly DailyTimeRange[];
};

function flattenItems(items: readonly Item[]): readonly Item[] {
  const result: Item[] = [];
  const seen = new Set<string>();
  function visit(item: Item) {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    result.push(item);
    item.children.forEach(visit);
  }
  items.forEach(visit);
  return result;
}

function getCalendarDate(now: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function toZonedInstant(date: CalendarDate, minute: number, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day, 0, minute);
  let candidate = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = formatter.formatToParts(new Date(candidate));
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((entry) => entry.type === type)?.value ?? 0);
    const represented = Date.UTC(
      part("year"), part("month") - 1, part("day"), part("hour"), part("minute"),
    );
    const adjustment = target - represented;
    candidate += adjustment;
    if (adjustment === 0) return new Date(candidate);
  }
  throw new Error("Recommendation Calendar boundaries require a valid time zone.");
}

/** Composes deterministic evidence into suggestions without executing them. */
class RecommendationService {
  constructor(
    private readonly analytics: AnalyticsReportProvider,
    private readonly patterns: PatternProvider,
    private readonly calendar: CalendarProvider,
    private readonly reviews: DailyReviewRepository,
    private readonly items: ItemRepository,
    private readonly availability: AvailabilityService,
    private readonly context: RecommendationContext,
  ) {}

  async getRecommendations(): Promise<readonly Recommendation[]> {
    const now = this.context.now ?? new Date();
    const date = getCalendarDate(now, this.context.timeZone);
    const analytics = await this.analytics.getReport();
    const [patterns, review, rootItems, calendar] = await Promise.all([
      this.patterns.getPatterns(analytics),
      this.reviews.get(),
      this.items.get(),
      this.calendar.getEvents({
        end: toZonedInstant(date, 24 * 60, this.context.timeZone),
        start: toZonedInstant(date, 0, this.context.timeZone),
        timeZone: this.context.timeZone,
      }),
    ]);
    const items = flattenItems(rootItems);
    const availableSlots = this.availability.getAvailableSlots({
      breaks: [],
      calendarEvents: calendar.events,
      date,
      timeBlocks: [],
      timeZone: this.context.timeZone,
      workingHours: this.context.workingHours ?? DEFAULT_WORKING_HOURS,
    });
    return generateRecommendations({
      analytics,
      availableSlots,
      calendar,
      date,
      now,
      patterns,
      projects: items.filter(isProject),
      review: review?.date === date ? review : null,
      tasks: items.filter(isTask),
      timeZone: this.context.timeZone,
    });
  }
}

export { RecommendationService };
export type { RecommendationContext };
