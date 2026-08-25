import type { CalendarProvider } from "./CalendarProvider";

/** Future read-only ICS adapter contract. Parsing and fetching remain private. */
interface ICSProvider extends CalendarProvider {
  readonly kind: "ics";
}

export type { ICSProvider };
