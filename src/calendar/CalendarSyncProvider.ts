import type { CalendarEvent } from "./CalendarEvent";

type CalendarAuthorization = {
  readonly email: string;
  readonly providerAccountId: string;
  readonly refreshToken: string;
};

type ProviderCalendar = {
  readonly accessRole: string;
  readonly color: string | null;
  readonly description: string | null;
  readonly externalId: string;
  readonly primary: boolean;
  readonly selectedByProvider: boolean;
  readonly timeZone: string | null;
  readonly title: string;
};

type ProviderEventChange = {
  readonly deleted: boolean;
  readonly event: CalendarEvent | null;
  readonly externalId: string;
};

type ProviderEventSync = {
  readonly changes: readonly ProviderEventChange[];
  readonly nextSyncToken: string;
};

type ProviderEventSyncInput = {
  readonly calendarId: string;
  readonly refreshToken: string;
  readonly syncToken: string | null;
  readonly timeZone: string;
};

/** Provider-specific OAuth and synchronization port used only by CalendarService. */
interface CalendarSyncProvider {
  readonly id: string;
  readonly kind: "google";
  readonly readOnly: true;
  authorize(code: string): Promise<CalendarAuthorization>;
  createAuthorizationUrl(state: string): string;
  listCalendars(refreshToken: string): Promise<readonly ProviderCalendar[]>;
  revoke(refreshToken: string): Promise<void>;
  syncEvents(input: ProviderEventSyncInput): Promise<ProviderEventSync>;
}

class CalendarSyncTokenExpiredError extends Error {
  constructor() {
    super("The Calendar sync token expired.");
    this.name = "CalendarSyncTokenExpiredError";
  }
}

export { CalendarSyncTokenExpiredError };
export type {
  CalendarAuthorization,
  CalendarSyncProvider,
  ProviderCalendar,
  ProviderEventChange,
  ProviderEventSync,
  ProviderEventSyncInput,
};
