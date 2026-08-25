import type {
  CalendarEvent,
  CalendarProvider,
  CalendarProviderSnapshot,
  CalendarRange,
} from "@/calendar";

/** Normalizes untrusted provider output before it reaches planning. */
class CalendarService implements CalendarProvider {
  readonly id: string;
  readonly kind: CalendarProvider["kind"];
  readonly readOnly = true as const;

  constructor(private readonly provider: CalendarProvider) {
    this.id = provider.id;
    this.kind = provider.kind;
  }

  async getEvents(range: CalendarRange): Promise<CalendarProviderSnapshot> {
    assertRange(range);

    try {
      const snapshot = await this.provider.getEvents(range);
      if (!snapshot.connected) {
        return { ...snapshot, events: [] };
      }

      return {
        ...snapshot,
        events: normalizeEvents(snapshot.events, range),
      };
    } catch {
      return {
        connected: false,
        events: [],
        message: "Calendar is temporarily unavailable. Atlas planning still works.",
      };
    }
  }
}

function assertRange(range: CalendarRange): void {
  if (
    !range.timeZone.trim() ||
    !Number.isFinite(range.start.getTime()) ||
    !Number.isFinite(range.end.getTime()) ||
    range.end <= range.start
  ) {
    throw new Error("Calendar range must have a time zone and valid boundaries.");
  }
}

function normalizeEvents(
  events: readonly CalendarEvent[],
  range: CalendarRange,
): readonly CalendarEvent[] {
  const unique = new Map<string, CalendarEvent>();

  for (const event of events) {
    if (
      !event.id.trim() ||
      !event.title.trim() ||
      !Number.isFinite(event.start.getTime()) ||
      !Number.isFinite(event.end.getTime()) ||
      event.end <= event.start ||
      event.start >= range.end ||
      event.end <= range.start
    ) continue;

    unique.set(event.id, {
      ...event,
      end: new Date(event.end),
      start: new Date(event.start),
      title: event.title.trim(),
    });
  }

  return [...unique.values()].sort((left, right) =>
    left.start.getTime() - right.start.getTime() ||
    left.end.getTime() - right.end.getTime() ||
    left.id.localeCompare(right.id),
  );
}

export { CalendarService };
