/** A provider-owned, read-only event projected into Atlas. */
type CalendarEvent = {
  readonly allDay: boolean;
  readonly busy: boolean;
  readonly calendarId: string | null;
  readonly description: string | null;
  readonly end: Date;
  readonly id: string;
  readonly location: string | null;
  readonly start: Date;
  readonly title: string;
};

export type { CalendarEvent };
