import type { CalendarConnection } from "@/calendar";
import type { CalendarRepository } from "@/repositories/CalendarRepository";

function clone(connection: CalendarConnection): CalendarConnection {
  return {
    ...connection,
    calendars: connection.calendars.map((calendar) => ({
      ...calendar,
      events: calendar.events.map((event) => ({
        ...event,
        end: new Date(event.end),
        start: new Date(event.start),
        synchronizedAt: new Date(event.synchronizedAt),
      })),
    })),
    connectedAt: new Date(connection.connectedAt),
    lastSyncedAt: connection.lastSyncedAt
      ? new Date(connection.lastSyncedAt)
      : null,
    updatedAt: new Date(connection.updatedAt),
  };
}

class MockCalendarRepository implements CalendarRepository {
  constructor(private connection: CalendarConnection | null = null) {}

  delete(): Promise<void> {
    this.connection = null;
    return Promise.resolve();
  }

  get(): Promise<CalendarConnection | null> {
    return Promise.resolve(this.connection ? clone(this.connection) : null);
  }

  save(connection: CalendarConnection): Promise<void> {
    this.connection = clone(connection);
    return Promise.resolve();
  }
}

export { MockCalendarRepository };
