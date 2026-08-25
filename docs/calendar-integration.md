# Google Calendar integration

Atlas imports Google Calendar events as read-only planning evidence. External
events remain owned by Google: they never become Items, Tasks, or Time Blocks,
and this integration cannot create, edit, or delete Calendar events.

## Dependency graph

```text
PlannerService
  -> CalendarProvider
     -> CalendarService
        -> CalendarRepository -> Prisma -> PostgreSQL
        -> CalendarSyncProvider
           -> GoogleCalendarProvider -> official Google API client

Planner UI
  -> CalendarFeature -> /api/atlas -> CalendarService

/api/calendar/google/connect + callback
  -> CalendarOAuthFeature -> CalendarService
```

`PlannerService` still imports only `CalendarProvider`. Google OAuth, refresh
tokens, sync cursors, API response shapes, and persistence cannot enter
planning code. The UI sees only `CalendarFeature` connection metadata and
commands. OAuth callback operations are exposed through a separate server-only
feature so authorization codes are not accepted by the generic browser RPC.

## OAuth and security

The integration follows Google's OAuth 2.0 web-server flow:

- it requests `openid`, `email`, and
  `https://www.googleapis.com/auth/calendar.readonly` only;
- `access_type=offline` allows background refresh;
- `prompt=consent` ensures a reconnect can return a refresh token;
- a random 256-bit `state` value is stored in an HttpOnly, SameSite cookie and
  compared with a constant-time check in the callback;
- the client ID, client secret, redirect URI, and encryption key are read only
  on the server;
- access tokens are short-lived and never stored by Atlas;
- refresh tokens are encrypted with AES-256-GCM before repository persistence;
- disconnect attempts Google revocation and always removes the local encrypted
  credential, calendar metadata, sync tokens, and cached events.

OAuth errors are reduced to safe Atlas messages. Tokens and Google response
payloads are never logged or returned through feature contracts.

## Persistence

`CalendarRepository` stores one single-user Google connection aggregate:

- provider account ID and email;
- encrypted refresh-token envelope;
- connection and sync timestamps;
- sync status and a safe error message;
- available calendars and explicit Atlas selection;
- one Google sync token per selected calendar;
- normalized read-only event cache.

PostgreSQL cascades connection deletion to calendar metadata and cached events.
Foreign-key paths, selected-calendar reads, and calendar/range event reads are
indexed. Event instants use `TIMESTAMPTZ`; all-day Google dates are converted at
the provider boundary with their IANA time zone, including daylight-saving
transitions.

The cache makes Calendar context available during a temporary provider outage.
It is a provider projection, not Atlas work truth.

## Synchronization

The first connection lists the account's calendars, defaults to calendars
selected by Google (always including the primary calendar), and performs a full
read-only sync. Initial event sync is limited to the previous year with no
future cutoff, matching Google's documented incremental-sync pattern.

Later refreshes:

1. refresh the Calendar List and preserve explicit Atlas selection;
2. remove metadata and cache for calendars deleted from the provider list;
3. send the stored per-calendar `syncToken`;
4. apply changed and cancelled events by stable provider identity;
5. persist the new sync token and cache atomically;
6. when Google returns HTTP 410, clear that calendar's cursor/cache and perform
   a new full sync, as required by Google.

Google pagination is followed for both Calendar List and Events. Recurring
series are expanded with `singleEvents=true`; deleted instances are retained in
incremental responses long enough to remove their cached projection.

Manual **Refresh now** and calendar selection use `CalendarFeature`. While the
Planner is open, a five-minute browser timer requests a refresh and reloads the
provider-neutral Planner projection. `CalendarService.getEvents` also refreshes
stale data on demand, so server reads remain correct without relying on a
long-running Railway process timer.

## Failure behavior

- Missing Google configuration leaves planning fully available and presents a
  setup message instead of attempting OAuth.
- Sync failure preserves and labels the last successful cache.
- A revoked or invalid credential moves sync to an error state and offers
  refresh, reconnect, or disconnect.
- Selecting no calendars is valid and yields an empty provider projection.
- Provider failure never changes a Day Plan or Task.

## Configuration

The server requires all four variables to enable the connection:

```text
GOOGLE_CALENDAR_CLIENT_ID
GOOGLE_CALENDAR_CLIENT_SECRET
GOOGLE_CALENDAR_REDIRECT_URI
CALENDAR_TOKEN_ENCRYPTION_KEY
```

The redirect URI must exactly match the Google Cloud OAuth client and normally
ends in `/api/calendar/google/callback`. The encryption key is a base64-encoded
32-byte random value. See `docs/deployment.md` for local and Railway setup.

## Verification coverage

Automated tests cover OAuth scope/state safety, encrypted token persistence,
first and repeated sync, changed and deleted events, calendar-list changes,
multiple calendar selection, expired sync-token recovery, disconnect cleanup,
and timezone/DST boundaries.

## Official references

- [OAuth 2.0 for web-server applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Calendar incremental synchronization](https://developers.google.com/workspace/calendar/api/guides/sync)
- [Events: list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)
- [CalendarList: list](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list)
