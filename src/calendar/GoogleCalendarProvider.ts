import type { CalendarProvider } from "./CalendarProvider";

/** Future Google adapter contract. OAuth and API concerns remain private. */
interface GoogleCalendarProvider extends CalendarProvider {
  readonly kind: "google";
}

export type { GoogleCalendarProvider };
