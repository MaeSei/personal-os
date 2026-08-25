import type { CalendarEvent } from "./CalendarEvent";

type CalendarSyncStatus = "error" | "idle" | "success" | "syncing";

type StoredCalendarEvent = CalendarEvent & {
  readonly externalId: string;
  readonly synchronizedAt: Date;
};

type ConnectedCalendar = {
  readonly accessRole: string;
  readonly color: string | null;
  readonly description: string | null;
  readonly events: readonly StoredCalendarEvent[];
  readonly externalId: string;
  readonly id: string;
  readonly primary: boolean;
  readonly selected: boolean;
  readonly syncToken: string | null;
  readonly timeZone: string | null;
  readonly title: string;
};

/** Server-owned snapshot. The refresh token is always an encrypted envelope. */
type CalendarConnection = {
  readonly calendars: readonly ConnectedCalendar[];
  readonly connectedAt: Date;
  readonly email: string;
  readonly encryptedRefreshToken: string;
  readonly id: string;
  readonly lastSyncedAt: Date | null;
  readonly provider: "google";
  readonly providerAccountId: string;
  readonly syncError: string | null;
  readonly syncStatus: CalendarSyncStatus;
  readonly updatedAt: Date;
};

export type {
  CalendarConnection,
  CalendarSyncStatus,
  ConnectedCalendar,
  StoredCalendarEvent,
};
