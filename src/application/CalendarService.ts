import { createHash } from "node:crypto";

import type {
  CalendarConnection,
  CalendarEvent,
  CalendarProvider,
  CalendarProviderSnapshot,
  CalendarRange,
  CalendarSyncProvider,
  ConnectedCalendar,
  ProviderCalendar,
  StoredCalendarEvent,
} from "../calendar";
import { CalendarSyncTokenExpiredError } from "../calendar";
import type {
  CalendarConnectionData,
  CalendarFeature,
  CalendarOAuthFeature,
} from "@/features/contracts/CalendarFeature";
import type { CalendarRepository } from "@/repositories/CalendarRepository";
import type { TokenCipher } from "@/server/security/TokenCipher";

const CONNECTION_ID = "google-calendar-connection";
const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1_000;

type CalendarServiceOptions = {
  readonly now?: () => Date;
  readonly refreshIntervalMs?: number;
  readonly timeZone: string;
};

/** Owns OAuth orchestration, encrypted sync state, and provider-neutral reads. */
class CalendarService implements CalendarProvider, CalendarFeature, CalendarOAuthFeature {
  readonly id = "atlas-google-calendar";
  readonly kind = "google" as const;
  readonly readOnly = true as const;
  private readonly now: () => Date;
  private readonly refreshIntervalMs: number;
  private syncInFlight: Promise<CalendarConnection> | null = null;

  constructor(
    private readonly repository: CalendarRepository,
    private readonly provider: CalendarSyncProvider | null,
    private readonly cipher: TokenCipher | null,
    private readonly options: CalendarServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date());
    this.refreshIntervalMs = options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;
  }

  async completeAuthorization(code: string): Promise<void> {
    const { provider, cipher } = this.requireIntegration();
    const authorization = await provider.authorize(code);
    const now = this.now();
    const remoteCalendars = await provider.listCalendars(authorization.refreshToken);
    const connection: CalendarConnection = {
      calendars: remoteCalendars.map((calendar) =>
        toConnectedCalendar(calendar, null, true),
      ),
      connectedAt: now,
      email: authorization.email,
      encryptedRefreshToken: cipher.encrypt(authorization.refreshToken),
      id: CONNECTION_ID,
      lastSyncedAt: null,
      provider: "google",
      providerAccountId: authorization.providerAccountId,
      syncError: null,
      syncStatus: "idle",
      updatedAt: now,
    };
    await this.repository.save(connection);
    await this.synchronize(connection, remoteCalendars);
  }

  createAuthorizationUrl(state: string): string {
    return this.requireIntegration().provider.createAuthorizationUrl(state);
  }

  async disconnect(): Promise<CalendarConnectionData> {
    const connection = await this.repository.get();
    if (connection && this.provider && this.cipher) {
      try {
        await this.provider.revoke(
          this.cipher.decrypt(connection.encryptedRefreshToken),
        );
      } catch {
        // Local credentials are removed even when Google is unavailable.
      }
    }
    await this.repository.delete();
    return this.disconnectedData();
  }

  async getConnection(): Promise<CalendarConnectionData> {
    return this.toConnectionData(await this.repository.get());
  }

  async getEvents(range: CalendarRange): Promise<CalendarProviderSnapshot> {
    assertRange(range);
    let connection = await this.repository.get();
    if (!connection) {
      return {
        connected: false,
        events: [],
        message: this.configured
          ? "Connect Google Calendar to see read-only events in planning."
          : "Google Calendar is not configured. Atlas planning remains available.",
      };
    }
    if (this.shouldRefresh(connection)) {
      connection = await this.synchronize(connection);
    }
    const events = connection.calendars
      .filter(({ selected }) => selected)
      .flatMap(({ events }) => events)
      .filter((event) => event.start < range.end && event.end > range.start);
    return {
      connected: true,
      events: normalizeEvents(events, range),
      message: connection.syncStatus === "error"
        ? "Showing the last synced events. Refresh Calendar or reconnect."
        : connection.lastSyncedAt
          ? `Read-only events synced ${formatRelativeSync(connection.lastSyncedAt, this.now())}.`
          : "Google Calendar is connected and awaiting its first sync.",
    };
  }

  async refresh(): Promise<CalendarConnectionData> {
    const connection = await this.repository.get();
    return this.toConnectionData(
      connection ? await this.synchronize(connection) : null,
    );
  }

  async selectCalendars(calendarIds: readonly string[]): Promise<CalendarConnectionData> {
    const connection = await this.repository.get();
    if (!connection) throw new Error("Connect Google Calendar before selecting calendars.");
    const validIds = new Set(connection.calendars.map(({ id }) => id));
    const requested = new Set(calendarIds);
    if ([...requested].some((id) => !validIds.has(id))) {
      throw new Error("One selected calendar is no longer available.");
    }
    const updated: CalendarConnection = {
      ...connection,
      calendars: connection.calendars.map((calendar) => {
        const selected = requested.has(calendar.id);
        return selected === calendar.selected
          ? calendar
          : { ...calendar, events: [], selected, syncToken: null };
      }),
      syncError: null,
      syncStatus: "idle",
      updatedAt: this.now(),
    };
    await this.repository.save(updated);
    return this.toConnectionData(await this.synchronize(updated));
  }

  private get configured(): boolean {
    return this.provider !== null && this.cipher !== null;
  }

  private requireIntegration(): {
    readonly cipher: TokenCipher;
    readonly provider: CalendarSyncProvider;
  } {
    if (!this.provider || !this.cipher) {
      throw new Error(
        "Google Calendar is not configured. Add the server-side OAuth and encryption variables.",
      );
    }
    return { cipher: this.cipher, provider: this.provider };
  }

  private shouldRefresh(connection: CalendarConnection): boolean {
    return this.configured && (
      !connection.lastSyncedAt ||
      this.now().getTime() - connection.lastSyncedAt.getTime() >= this.refreshIntervalMs
    );
  }

  private async synchronize(
    connection: CalendarConnection,
    knownCalendars?: readonly ProviderCalendar[],
  ): Promise<CalendarConnection> {
    if (!this.configured) return connection;
    if (this.syncInFlight) {
      await this.syncInFlight;
      const latest = await this.repository.get();
      return latest ? this.synchronize(latest, knownCalendars) : connection;
    }
    this.syncInFlight = this.performSync(connection, knownCalendars).finally(() => {
      this.syncInFlight = null;
    });
    return this.syncInFlight;
  }

  private async performSync(
    connection: CalendarConnection,
    knownCalendars?: readonly ProviderCalendar[],
  ): Promise<CalendarConnection> {
    const { provider, cipher } = this.requireIntegration();
    const syncing = {
      ...connection,
      syncError: null,
      syncStatus: "syncing" as const,
      updatedAt: this.now(),
    };
    await this.repository.save(syncing);
    try {
      const refreshToken = cipher.decrypt(connection.encryptedRefreshToken);
      const remoteCalendars = knownCalendars ?? await provider.listCalendars(refreshToken);
      const currentByExternalId = new Map(
        connection.calendars.map((calendar) => [calendar.externalId, calendar]),
      );
      const calendars = remoteCalendars.map((remote) =>
        toConnectedCalendar(
          remote,
          currentByExternalId.get(remote.externalId) ?? null,
          false,
        ),
      );
      const synchronized: ConnectedCalendar[] = [];
      for (const calendar of calendars) {
        synchronized.push(
          calendar.selected
            ? await this.syncCalendar(calendar, refreshToken)
            : { ...calendar, events: [], syncToken: null },
        );
      }
      const now = this.now();
      const success: CalendarConnection = {
        ...connection,
        calendars: synchronized,
        lastSyncedAt: now,
        syncError: null,
        syncStatus: "success",
        updatedAt: now,
      };
      await this.repository.save(success);
      return success;
    } catch {
      const failure: CalendarConnection = {
        ...connection,
        syncError: "Google Calendar sync failed. Try again or reconnect.",
        syncStatus: "error",
        updatedAt: this.now(),
      };
      await this.repository.save(failure);
      return failure;
    }
  }

  private async syncCalendar(
    calendar: ConnectedCalendar,
    refreshToken: string,
  ): Promise<ConnectedCalendar> {
    const provider = this.requireIntegration().provider;
    let reset = false;
    let result;
    try {
      result = await provider.syncEvents({
        calendarId: calendar.externalId,
        refreshToken,
        syncToken: calendar.syncToken,
        timeZone: calendar.timeZone ?? this.options.timeZone,
      });
    } catch (error) {
      if (!(error instanceof CalendarSyncTokenExpiredError)) throw error;
      reset = true;
      result = await provider.syncEvents({
        calendarId: calendar.externalId,
        refreshToken,
        syncToken: null,
        timeZone: calendar.timeZone ?? this.options.timeZone,
      });
    }
    const events = new Map(
      (reset || !calendar.syncToken ? [] : calendar.events)
        .map((event) => [event.externalId, event]),
    );
    for (const change of result.changes) {
      if (change.deleted || !change.event) {
        events.delete(change.externalId);
        continue;
      }
      const event: StoredCalendarEvent = {
        ...change.event,
        calendarId: calendar.externalId,
        externalId: change.externalId,
        id: stableId(`${calendar.id}:event`, change.externalId),
        synchronizedAt: this.now(),
      };
      events.set(change.externalId, event);
    }
    return {
      ...calendar,
      events: [...events.values()].sort(compareEvents),
      syncToken: result.nextSyncToken,
    };
  }

  private disconnectedData(): CalendarConnectionData {
    return {
      calendars: [],
      configured: this.configured,
      connected: false,
      email: null,
      lastSyncedAt: null,
      message: this.configured
        ? "Google Calendar is ready to connect."
        : "Add Google Calendar server credentials to enable connection.",
      status: "idle",
    };
  }

  private toConnectionData(
    connection: CalendarConnection | null,
  ): CalendarConnectionData {
    if (!connection) return this.disconnectedData();
    return {
      calendars: connection.calendars.map((calendar) => ({
        color: calendar.color,
        id: calendar.id,
        primary: calendar.primary,
        selected: calendar.selected,
        timeZone: calendar.timeZone,
        title: calendar.title,
      })),
      configured: this.configured,
      connected: true,
      email: connection.email,
      lastSyncedAt: connection.lastSyncedAt,
      message: connection.syncError ?? "Calendar is connected read-only.",
      status: connection.syncStatus,
    };
  }
}

function assertRange(range: CalendarRange): void {
  if (
    !range.timeZone.trim() ||
    !Number.isFinite(range.start.getTime()) ||
    !Number.isFinite(range.end.getTime()) ||
    range.end <= range.start
  ) {
    throw new Error("Calendar range must have a time zone and valid boundaries.");
  }
}

function normalizeEvents(
  events: readonly CalendarEvent[],
  range: CalendarRange,
): readonly CalendarEvent[] {
  const unique = new Map<string, CalendarEvent>();

  for (const event of events) {
    if (
      !event.id.trim() ||
      !event.title.trim() ||
      !Number.isFinite(event.start.getTime()) ||
      !Number.isFinite(event.end.getTime()) ||
      event.end <= event.start ||
      event.start >= range.end ||
      event.end <= range.start
    ) continue;

    unique.set(event.id, {
      ...event,
      end: new Date(event.end),
      start: new Date(event.start),
      title: event.title.trim(),
    });
  }

  return [...unique.values()].sort((left, right) =>
    left.start.getTime() - right.start.getTime() ||
    left.end.getTime() - right.end.getTime() ||
    left.id.localeCompare(right.id),
  );
}

function toConnectedCalendar(
  remote: ProviderCalendar,
  existing: ConnectedCalendar | null,
  initial: boolean,
): ConnectedCalendar {
  return {
    accessRole: remote.accessRole,
    color: remote.color,
    description: remote.description,
    events: existing?.events ?? [],
    externalId: remote.externalId,
    id: existing?.id ?? stableId("google-calendar", remote.externalId),
    primary: remote.primary,
    selected: existing?.selected ?? (remote.primary || (initial && remote.selectedByProvider)),
    syncToken: existing?.syncToken ?? null,
    timeZone: remote.timeZone,
    title: remote.title,
  };
}

function stableId(prefix: string, value: string): string {
  return `${prefix}-${createHash("sha256").update(value).digest("base64url")}`;
}

function compareEvents(left: CalendarEvent, right: CalendarEvent): number {
  return left.start.getTime() - right.start.getTime() ||
    left.end.getTime() - right.end.getTime() || left.id.localeCompare(right.id);
}

function formatRelativeSync(syncedAt: Date, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - syncedAt.getTime()) / 60_000));
  if (minutes < 1) return "just now";
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
}

export { CalendarService };
export type { CalendarServiceOptions };
