import assert from "node:assert/strict";
import test from "node:test";

import { CalendarService } from "../src/application/CalendarService";
import {
  CalendarSyncTokenExpiredError,
  GoogleCalendarProvider,
  type CalendarEvent,
  type CalendarSyncProvider,
  type CalendarRange,
  type ProviderCalendar,
  type ProviderEventSync,
  type ProviderEventSyncInput,
} from "../src/calendar";
import { MockCalendarRepository } from "../src/repositories/MockCalendarRepository";
import { AesGcmTokenCipher } from "../src/server/security/TokenCipher";
import { matchesOAuthState } from "../src/server/security/oauthState";
import { mapGoogleCalendarEvent } from "../src/calendar/GoogleCalendarProvider";

const range: CalendarRange = {
  end: new Date("2026-08-25T22:00:00.000Z"),
  start: new Date("2026-08-24T22:00:00.000Z"),
  timeZone: "Europe/Stockholm",
};

function event(
  id: string,
  start: string,
  end: string,
  title = id,
): CalendarEvent {
  return {
    allDay: false,
    busy: true,
    calendarId: "primary",
    description: null,
    end: new Date(end),
    id,
    location: null,
    start: new Date(start),
    title,
  };
}

const primaryCalendar: ProviderCalendar = {
  accessRole: "owner",
  color: "#16815d",
  description: null,
  externalId: "primary@example.com",
  primary: true,
  selectedByProvider: true,
  timeZone: "Europe/Stockholm",
  title: "Primary",
};

class FakeGoogleProvider implements CalendarSyncProvider {
  readonly id = "fake-google";
  readonly kind = "google" as const;
  readonly readOnly = true as const;
  calendars: readonly ProviderCalendar[] = [primaryCalendar];
  readonly calls: ProviderEventSyncInput[] = [];
  readonly queued = new Map<string, ProviderEventSync[]>();
  expireNextToken = false;
  revoked = false;

  authorize() {
    return Promise.resolve({
      email: "maike@example.com",
      providerAccountId: "google-account",
      refreshToken: "plain-refresh-token",
    });
  }
  createAuthorizationUrl(state: string) { return `https://accounts.google.test/?state=${state}`; }
  listCalendars() { return Promise.resolve(this.calendars); }
  revoke() { this.revoked = true; return Promise.resolve(); }
  syncEvents(input: ProviderEventSyncInput): Promise<ProviderEventSync> {
    this.calls.push(input);
    if (this.expireNextToken && input.syncToken) {
      this.expireNextToken = false;
      throw new CalendarSyncTokenExpiredError();
    }
    const queued = this.queued.get(input.calendarId) ?? [];
    return Promise.resolve(queued.shift() ?? {
      changes: [],
      nextSyncToken: `${input.calendarId}-next`,
    });
  }
}

function createService(provider: FakeGoogleProvider) {
  const repository = new MockCalendarRepository();
  const cipher = AesGcmTokenCipher.fromBase64Key(
    Buffer.alloc(32, 7).toString("base64"),
  );
  return {
    repository,
    service: new CalendarService(repository, provider, cipher, {
      now: () => new Date("2026-08-25T12:00:00.000Z"),
      refreshIntervalMs: Number.POSITIVE_INFINITY,
      timeZone: "Europe/Stockholm",
    }),
  };
}

function sync(changes: readonly CalendarEvent[], token: string): ProviderEventSync {
  return {
    changes: changes.map((calendarEvent) => ({
      deleted: false,
      event: calendarEvent,
      externalId: calendarEvent.id,
    })),
    nextSyncToken: token,
  };
}

test("Google OAuth URL requests offline, read-only access with CSRF state", () => {
  const provider = new GoogleCalendarProvider({
    clientId: "client-id",
    clientSecret: "server-secret",
    redirectUri: "https://atlas.example/api/calendar/google/callback",
  });
  const url = new URL(provider.createAuthorizationUrl("secure-state"));

  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("state"), "secure-state");
  assert.match(url.searchParams.get("scope") ?? "", /calendar\.readonly/);
  assert.equal(url.toString().includes("server-secret"), false);
  assert.equal(matchesOAuthState("secure-state", "secure-state"), true);
  assert.equal(matchesOAuthState("secure-state", "different-state"), false);
});

test("disconnect revokes Google access and removes all local Calendar data", async () => {
  const provider = new FakeGoogleProvider();
  const { repository, service } = createService(provider);
  await service.completeAuthorization("code");

  const result = await service.disconnect();

  assert.equal(provider.revoked, true);
  assert.equal(result.connected, false);
  assert.equal(await repository.get(), null);
});

test("first sync encrypts credentials and caches selected Calendar events", async () => {
  const provider = new FakeGoogleProvider();
  provider.queued.set(primaryCalendar.externalId, [sync([
    event("meeting", "2026-08-25T08:00:00+02:00", "2026-08-25T09:00:00+02:00"),
  ], "sync-1")]);
  const { repository, service } = createService(provider);

  await service.completeAuthorization("authorization-code");
  const stored = await repository.get();
  const snapshot = await service.getEvents(range);

  assert.equal(stored?.encryptedRefreshToken.includes("plain-refresh-token"), false);
  assert.equal(stored?.calendars[0]?.syncToken, "sync-1");
  assert.deepEqual(snapshot.events.map(({ title }) => title), ["meeting"]);
  assert.equal(provider.calls[0]?.syncToken, null);
});

test("repeated sync updates, inserts, and removes events without duplicates", async () => {
  const provider = new FakeGoogleProvider();
  provider.queued.set(primaryCalendar.externalId, [
    sync([event("one", "2026-08-25T06:00:00Z", "2026-08-25T07:00:00Z")], "sync-1"),
    {
      changes: [
        { deleted: true, event: null, externalId: "one" },
        { deleted: false, event: event("two", "2026-08-25T10:00:00Z", "2026-08-25T11:00:00Z"), externalId: "two" },
      ],
      nextSyncToken: "sync-2",
    },
  ]);
  const { repository, service } = createService(provider);

  await service.completeAuthorization("code");
  await service.refresh();
  const stored = await repository.get();

  assert.deepEqual(stored?.calendars[0]?.events.map(({ externalId }) => externalId), ["two"]);
  assert.equal(stored?.calendars[0]?.syncToken, "sync-2");
  assert.equal(provider.calls[1]?.syncToken, "sync-1");
});

test("calendar selection and provider list changes keep multiple calendars isolated", async () => {
  const provider = new FakeGoogleProvider();
  const team = { ...primaryCalendar, externalId: "team@example.com", primary: false, title: "Team" };
  provider.calendars = [primaryCalendar, team];
  provider.queued.set(primaryCalendar.externalId, [sync([], "primary-1")]);
  provider.queued.set(team.externalId, [sync([
    event("team-event", "2026-08-25T09:00:00Z", "2026-08-25T10:00:00Z"),
  ], "team-1")]);
  const { repository, service } = createService(provider);

  await service.completeAuthorization("code");
  const teamId = (await service.getConnection()).calendars.find(({ title }) => title === "Team")?.id;
  assert.ok(teamId);
  await service.selectCalendars([teamId]);
  provider.calendars = [team];
  await service.refresh();
  const stored = await repository.get();

  assert.deepEqual(stored?.calendars.map(({ title }) => title), ["Team"]);
  assert.deepEqual(stored?.calendars[0]?.events.map(({ externalId }) => externalId), ["team-event"]);
});

test("expired sync tokens trigger a clean full sync and preserve timezone instants", async () => {
  const provider = new FakeGoogleProvider();
  provider.queued.set(primaryCalendar.externalId, [
    sync([event("old", "2026-08-25T06:00:00Z", "2026-08-25T07:00:00Z")], "sync-1"),
    sync([event("new", "2026-08-25T10:00:00+02:00", "2026-08-25T11:00:00+02:00")], "sync-reset"),
  ]);
  const { service } = createService(provider);
  await service.completeAuthorization("code");
  provider.expireNextToken = true;

  await service.refresh();
  const snapshot = await service.getEvents(range);

  assert.equal(provider.calls.at(-1)?.syncToken, null);
  assert.deepEqual(snapshot.events.map(({ id }) => id).length, 1);
  assert.equal(snapshot.events[0]?.start.toISOString(), "2026-08-25T08:00:00.000Z");
});

test("Google all-day events preserve local date boundaries across daylight saving", () => {
  const change = mapGoogleCalendarEvent({
    end: { date: "2026-03-30" },
    id: "all-day",
    start: { date: "2026-03-29" },
    summary: "All day",
  }, "primary@example.com", "Europe/Stockholm");

  assert.equal(change?.event?.start.toISOString(), "2026-03-28T23:00:00.000Z");
  assert.equal(change?.event?.end.toISOString(), "2026-03-29T22:00:00.000Z");
  assert.equal(change?.event?.allDay, true);
});

test("Google events declined by the connected user are normalized as non-busy", () => {
  const change = mapGoogleCalendarEvent({
    attendees: [
      { email: "other@example.com", responseStatus: "accepted" },
      { email: "maike@example.com", responseStatus: "declined", self: true },
    ],
    end: { dateTime: "2026-08-25T11:00:00+02:00" },
    id: "declined-meeting",
    start: { dateTime: "2026-08-25T10:00:00+02:00" },
    summary: "Declined meeting",
  }, "primary@example.com", "Europe/Stockholm");

  assert.equal(change?.event?.busy, false);
  assert.equal(change?.event?.responseStatus, "declined");
});
