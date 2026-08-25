import type { CalendarResponseStatus } from "../domain/AvailabilityService";

/** A provider-owned, read-only event projected into Atlas. */
type CalendarEvent = {
  readonly allDay: boolean;
  readonly busy: boolean;
  readonly calendarId: string | null;
  readonly description: string | null;
  readonly end: Date;
  readonly id: string;
  readonly location: string | null;
  readonly recurringEventId?: string | null;
  /** The connected user's response when the provider supplies one. */
  readonly responseStatus?: CalendarResponseStatus | null;
  readonly start: Date;
  readonly timeZone?: string | null;
  readonly title: string;
};

export type { CalendarEvent };
