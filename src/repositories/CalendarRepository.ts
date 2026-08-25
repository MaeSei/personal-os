import type { CalendarConnection } from "@/calendar";

/** Persists the single-user Calendar connection and its read-only cache. */
interface CalendarRepository {
  delete(): Promise<void>;
  get(): Promise<CalendarConnection | null>;
  save(connection: CalendarConnection): Promise<void>;
}

export type { CalendarRepository };
