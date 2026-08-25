import type { CalendarEvent } from "./CalendarEvent";
import type {
  CalendarProvider,
  CalendarProviderSnapshot,
} from "./CalendarProvider";

type MockCalendarProviderOptions = {
  readonly connected?: boolean;
  readonly events?: readonly CalendarEvent[];
  readonly message?: string;
};

const NOT_CONNECTED_MESSAGE =
  "No external calendar is connected. Atlas planning remains fully available.";

/** Deterministic provider for local development and application tests. */
class MockCalendarProvider implements CalendarProvider {
  readonly id = "mock-calendar";
  readonly kind = "mock" as const;
  readonly readOnly = true as const;

  constructor(private readonly options: MockCalendarProviderOptions = {}) {}

  getEvents(): Promise<CalendarProviderSnapshot> {
    const connected = this.options.connected ?? false;
    return Promise.resolve({
      connected,
      events: connected ? (this.options.events ?? []).map(cloneEvent) : [],
      message: this.options.message ?? (connected
        ? "Calendar events are shown as read-only planning constraints."
        : NOT_CONNECTED_MESSAGE),
    });
  }
}

function cloneEvent(event: CalendarEvent): CalendarEvent {
  return {
    ...event,
    end: new Date(event.end),
    start: new Date(event.start),
  };
}

export { MockCalendarProvider, NOT_CONNECTED_MESSAGE };
export type { MockCalendarProviderOptions };
