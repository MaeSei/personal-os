import type { CalendarDate } from "./Item";
import type { TimeBlock } from "./Planning";

const MILLISECONDS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 24 * 60;

enum CalendarResponseStatus {
  Accepted = "accepted",
  Declined = "declined",
  NeedsAction = "needsAction",
  Tentative = "tentative",
}

type DailyTimeRange = {
  /** Inclusive minute from local midnight. */
  readonly start: number;
  /** Exclusive minute from local midnight. */
  readonly end: number;
};

/** Provider-neutral event occurrence. Recurring events arrive as occurrences. */
type AvailabilityCalendarEvent = {
  readonly allDay: boolean;
  readonly busy: boolean;
  readonly calendarId?: string | null;
  readonly end: Date;
  readonly id: string;
  readonly recurringEventId?: string | null;
  readonly responseStatus?: CalendarResponseStatus | null;
  readonly start: Date;
};

type AvailabilityInput = {
  readonly breaks: readonly DailyTimeRange[];
  readonly calendarEvents: readonly AvailabilityCalendarEvent[];
  readonly date: CalendarDate;
  readonly timeBlocks: readonly Pick<TimeBlock, "end" | "start">[];
  readonly timeZone: string;
  readonly workingHours: readonly DailyTimeRange[];
};

type AvailableSlot = {
  /** Exact elapsed minutes between start and end. */
  readonly duration: number;
  readonly end: Date;
  readonly start: Date;
};

type InstantRange = {
  readonly end: number;
  readonly start: number;
};

function assertCalendarDate(value: string): asserts value is CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : null;
  if (
    !match || !date ||
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) throw new Error("Availability requires a valid YYYY-MM-DD date.");
}

function assertTimeZone(timeZone: string): void {
  if (!timeZone.trim()) throw new Error("Availability requires a time zone.");
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(0));
  } catch {
    throw new Error("Availability requires a valid IANA time zone.");
  }
}

function assertDailyRange(range: DailyTimeRange, label: string): void {
  if (
    !Number.isInteger(range.start) ||
    !Number.isInteger(range.end) ||
    range.start < 0 ||
    range.end > MINUTES_PER_DAY ||
    range.end <= range.start
  ) {
    throw new Error(`${label} must use ordered whole minutes within one day.`);
  }
}

function assertEvent(event: AvailabilityCalendarEvent): void {
  if (
    !event.id.trim() ||
    !Number.isFinite(event.start.getTime()) ||
    !Number.isFinite(event.end.getTime()) ||
    event.end <= event.start
  ) throw new Error("Calendar events require an id and valid boundaries.");
}

/** Converts one local wall-clock minute into its exact instant. */
function toZonedInstant(
  date: CalendarDate,
  minute: number,
  timeZone: string,
): Date {
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
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
    );
    const adjustment = target - represented;
    candidate += adjustment;
    if (adjustment === 0) return new Date(candidate);
  }

  throw new Error("An availability boundary does not exist in this time zone.");
}

function toInstantRange(
  range: DailyTimeRange,
  date: CalendarDate,
  timeZone: string,
): InstantRange {
  return {
    end: toZonedInstant(date, range.end, timeZone).getTime(),
    start: toZonedInstant(date, range.start, timeZone).getTime(),
  };
}

function mergeRanges(ranges: readonly InstantRange[]): readonly InstantRange[] {
  const ordered = [...ranges].sort((left, right) =>
    left.start - right.start || left.end - right.end
  );
  const merged: InstantRange[] = [];

  for (const range of ordered) {
    const previous = merged.at(-1);
    if (!previous || range.start > previous.end) {
      merged.push({ ...range });
      continue;
    }
    merged[merged.length - 1] = {
      end: Math.max(previous.end, range.end),
      start: previous.start,
    };
  }
  return merged;
}

function subtractBusyTime(
  workingRange: InstantRange,
  busyRanges: readonly InstantRange[],
): readonly InstantRange[] {
  const available: InstantRange[] = [];
  let cursor = workingRange.start;

  for (const busy of busyRanges) {
    if (busy.end <= cursor || busy.start >= workingRange.end) continue;
    const clippedStart = Math.max(busy.start, workingRange.start);
    const clippedEnd = Math.min(busy.end, workingRange.end);
    if (clippedStart > cursor) available.push({ end: clippedStart, start: cursor });
    cursor = Math.max(cursor, clippedEnd);
    if (cursor >= workingRange.end) break;
  }
  if (cursor < workingRange.end) {
    available.push({ end: workingRange.end, start: cursor });
  }
  return available;
}

/** Pure calculation used by the service and directly by deterministic tests. */
function calculateAvailability(input: AvailabilityInput): readonly AvailableSlot[] {
  assertCalendarDate(input.date);
  assertTimeZone(input.timeZone);
  input.workingHours.forEach((range) => assertDailyRange(range, "Working hours"));
  input.breaks.forEach((range) => assertDailyRange(range, "Breaks"));
  input.timeBlocks.forEach((range) => assertDailyRange(range, "Time Blocks"));
  input.calendarEvents.forEach(assertEvent);

  const workingRanges = mergeRanges(input.workingHours.map((range) =>
    toInstantRange(range, input.date, input.timeZone)
  ));
  const localBusyRanges = [...input.breaks, ...input.timeBlocks].map((range) =>
    toInstantRange(range, input.date, input.timeZone)
  );
  const calendarBusyRanges = input.calendarEvents
    .filter((event) =>
      event.busy && event.responseStatus !== CalendarResponseStatus.Declined
    )
    .map((event) => ({ end: event.end.getTime(), start: event.start.getTime() }));
  const busyRanges = mergeRanges([...localBusyRanges, ...calendarBusyRanges]);

  return workingRanges
    .flatMap((workingRange) => subtractBusyTime(workingRange, busyRanges))
    .map((slot) => ({
      duration: (slot.end - slot.start) / MILLISECONDS_PER_MINUTE,
      end: new Date(slot.end),
      start: new Date(slot.start),
    }));
}

/** Calculates open working slots without persistence or provider knowledge. */
class AvailabilityService {
  getAvailableSlots(input: AvailabilityInput): readonly AvailableSlot[] {
    return calculateAvailability(input);
  }
}

export {
  AvailabilityService,
  CalendarResponseStatus,
  calculateAvailability,
};
export type {
  AvailabilityCalendarEvent,
  AvailabilityInput,
  AvailableSlot,
  DailyTimeRange,
};
