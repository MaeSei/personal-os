import { google, type calendar_v3 } from "googleapis";

import { CalendarResponseStatus } from "../domain/AvailabilityService";

import {
  CalendarSyncTokenExpiredError,
  type CalendarAuthorization,
  type CalendarSyncProvider,
  type ProviderCalendar,
  type ProviderEventChange,
  type ProviderEventSync,
  type ProviderEventSyncInput,
} from "./CalendarSyncProvider";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1_000;

type GoogleCalendarProviderOptions = {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly now?: () => Date;
  readonly redirectUri: string;
};

/** Official Google API adapter. Credentials and Google response shapes stay here. */
class GoogleCalendarProvider implements CalendarSyncProvider {
  readonly id = "google-calendar";
  readonly kind = "google" as const;
  readonly readOnly = true as const;
  private readonly now: () => Date;

  constructor(private readonly options: GoogleCalendarProviderOptions) {
    this.now = options.now ?? (() => new Date());
  }

  async authorize(code: string): Promise<CalendarAuthorization> {
    if (!code.trim()) throw new Error("Google did not return an authorization code.");
    const client = this.createClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error(
        "Google did not return a refresh token. Reconnect and grant offline access.",
      );
    }
    client.setCredentials(tokens);
    const response = await google.oauth2({ auth: client, version: "v2" }).userinfo.get();
    if (!response.data.id || !response.data.email) {
      throw new Error("Google did not return an identifiable Calendar account.");
    }
    return {
      email: response.data.email,
      providerAccountId: response.data.id,
      refreshToken: tokens.refresh_token,
    };
  }

  createAuthorizationUrl(state: string): string {
    if (!state.trim()) throw new Error("OAuth state is required.");
    return this.createClient().generateAuthUrl({
      access_type: "offline",
      include_granted_scopes: true,
      prompt: "consent",
      scope: ["openid", "email", CALENDAR_SCOPE],
      state,
    });
  }

  async listCalendars(refreshToken: string): Promise<readonly ProviderCalendar[]> {
    const calendarApi = this.createCalendarApi(refreshToken);
    const calendars: ProviderCalendar[] = [];
    let pageToken: string | undefined;
    do {
      const response = await calendarApi.calendarList.list({
        maxResults: 250,
        pageToken,
      });
      for (const calendar of response.data.items ?? []) {
        if (!calendar.id || calendar.deleted) continue;
        calendars.push({
          accessRole: calendar.accessRole ?? "reader",
          color: calendar.backgroundColor ?? null,
          description: calendar.description ?? null,
          externalId: calendar.id,
          primary: calendar.primary ?? false,
          selectedByProvider: calendar.selected ?? false,
          timeZone: calendar.timeZone ?? null,
          title: (calendar.summaryOverride ?? calendar.summary ?? "Calendar").trim(),
        });
      }
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
    return calendars;
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.createClient().revokeToken(refreshToken);
  }

  async syncEvents(input: ProviderEventSyncInput): Promise<ProviderEventSync> {
    const calendarApi = this.createCalendarApi(input.refreshToken);
    const changes: ProviderEventChange[] = [];
    let nextSyncToken: string | null = null;
    let pageToken: string | undefined;

    do {
      try {
        const response = await calendarApi.events.list({
          calendarId: input.calendarId,
          maxResults: 2_500,
          pageToken,
          showDeleted: true,
          singleEvents: true,
          ...(input.syncToken
            ? { syncToken: input.syncToken }
            : { timeMin: new Date(this.now().getTime() - ONE_YEAR_MS).toISOString() }),
          timeZone: input.timeZone,
        });
        changes.push(
          ...(response.data.items ?? []).flatMap((event) => {
            const change = mapGoogleCalendarEvent(event, input.calendarId, input.timeZone);
            return change ? [change] : [];
          }),
        );
        pageToken = response.data.nextPageToken ?? undefined;
        nextSyncToken = response.data.nextSyncToken ?? nextSyncToken;
      } catch (error) {
        if (getResponseStatus(error) === 410) {
          throw new CalendarSyncTokenExpiredError();
        }
        throw error;
      }
    } while (pageToken);

    if (!nextSyncToken) {
      throw new Error("Google Calendar did not return a synchronization token.");
    }
    return { changes, nextSyncToken };
  }

  private createCalendarApi(refreshToken: string): calendar_v3.Calendar {
    if (!refreshToken) throw new Error("A Google refresh token is required.");
    const client = this.createClient();
    client.setCredentials({ refresh_token: refreshToken });
    return google.calendar({ auth: client, version: "v3" });
  }

  private createClient() {
    return new google.auth.OAuth2(
      this.options.clientId,
      this.options.clientSecret,
      this.options.redirectUri,
    );
  }
}

function mapGoogleCalendarEvent(
  event: calendar_v3.Schema$Event,
  calendarId: string,
  defaultTimeZone: string,
): ProviderEventChange | null {
  if (!event.id) return null;
  if (event.status === "cancelled") {
    return { deleted: true, event: null, externalId: event.id };
  }
  const allDay = Boolean(event.start?.date && event.end?.date);
  const timeZone = event.start?.timeZone ?? event.end?.timeZone ?? defaultTimeZone;
  const start = allDay
    ? toZonedMidnight(event.start?.date, timeZone)
    : toInstant(event.start?.dateTime);
  const end = allDay
    ? toZonedMidnight(event.end?.date, timeZone)
    : toInstant(event.end?.dateTime);
  if (!start || !end || end <= start) return null;
  const responseStatus = getSelfResponseStatus(event);
  return {
    deleted: false,
    externalId: event.id,
    event: {
      allDay,
      busy:
        event.transparency !== "transparent" &&
        responseStatus !== CalendarResponseStatus.Declined,
      calendarId,
      description: event.description ?? null,
      end,
      id: event.id,
      location: event.location ?? null,
      recurringEventId: event.recurringEventId ?? null,
      responseStatus,
      start,
      timeZone,
      title: event.summary?.trim() || "Busy",
    },
  };
}

function getSelfResponseStatus(
  event: calendar_v3.Schema$Event,
): CalendarResponseStatus | null {
  const response = event.attendees?.find(({ self }) => self)?.responseStatus;
  return Object.values(CalendarResponseStatus).find((status) => status === response) ?? null;
}

function toInstant(value: string | null | undefined): Date | null {
  if (!value) return null;
  const result = new Date(value);
  return Number.isFinite(result.getTime()) ? result : null;
}

function toZonedMidnight(
  value: string | null | undefined,
  timeZone: string,
): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  let candidate = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(candidate));
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((entry) => entry.type === type)?.value ?? 0);
    const represented = Date.UTC(
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
    );
    const adjustment = target - represented;
    candidate += adjustment;
    if (adjustment === 0) return new Date(candidate);
  }
  return null;
}

function getResponseStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return null;
  }
  const response = error.response;
  if (typeof response !== "object" || response === null || !("status" in response)) {
    return null;
  }
  return typeof response.status === "number" ? response.status : null;
}

export { GoogleCalendarProvider, mapGoogleCalendarEvent };
export type { GoogleCalendarProviderOptions };
