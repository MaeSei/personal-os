import type { CalendarSyncStatus } from "@/calendar";

type CalendarSelection = {
  readonly color: string | null;
  readonly id: string;
  readonly primary: boolean;
  readonly selected: boolean;
  readonly timeZone: string | null;
  readonly title: string;
};

type CalendarConnectionData = {
  readonly calendars: readonly CalendarSelection[];
  readonly configured: boolean;
  readonly connected: boolean;
  readonly email: string | null;
  readonly lastSyncedAt: Date | null;
  readonly message: string;
  readonly status: CalendarSyncStatus;
};

/** UI-safe Calendar commands. OAuth credentials never cross this contract. */
interface CalendarFeature {
  disconnect(): Promise<CalendarConnectionData>;
  getConnection(): Promise<CalendarConnectionData>;
  refresh(): Promise<CalendarConnectionData>;
  selectCalendars(calendarIds: readonly string[]): Promise<CalendarConnectionData>;
}

/** Server route boundary for the OAuth redirect and callback only. */
interface CalendarOAuthFeature {
  completeAuthorization(code: string): Promise<void>;
  createAuthorizationUrl(state: string): string;
}

export type {
  CalendarConnectionData,
  CalendarFeature,
  CalendarOAuthFeature,
  CalendarSelection,
};
