import type { CalendarEvent } from "./CalendarEvent";

type CalendarProviderKind = "google" | "ics" | "mock";

type CalendarRange = {
  readonly end: Date;
  readonly start: Date;
  readonly timeZone: string;
};

type CalendarProviderSnapshot = {
  readonly connected: boolean;
  readonly events: readonly CalendarEvent[];
  readonly message: string;
};

/** Read-only port used by Atlas planning. Provider details stay behind it. */
interface CalendarProvider {
  readonly id: string;
  readonly kind: CalendarProviderKind;
  readonly readOnly: true;
  getEvents(range: CalendarRange): Promise<CalendarProviderSnapshot>;
}

export type {
  CalendarProvider,
  CalendarProviderKind,
  CalendarProviderSnapshot,
  CalendarRange,
};
