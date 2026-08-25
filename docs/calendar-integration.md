# Calendar Integration Layer

Atlas now has a read-only integration boundary for external calendars. The
boundary prepares planning for calendar evidence without introducing OAuth,
credentials, network requests, persistence, or synchronization.

## Dependency graph

```text
PlannerService
  -> CalendarProvider
     -> CalendarService (normalization and failure isolation)
        -> MockCalendarProvider (current composition)

Future composition only:
  CalendarService -> ICSProvider implementation
  CalendarService -> GoogleCalendarProvider implementation
```

`PlannerService` imports only the `CalendarProvider` contract. It cannot access
Google, ICS parsing, credentials, or provider-specific response objects.
`src/application/container.ts` is the only production location that selects the
current provider.

## Contracts

### CalendarEvent

A `CalendarEvent` is a normalized, provider-owned projection with identity,
title, start/end instants, all-day and busy flags, and optional calendar,
description, and location metadata. Events are read-only. They are not Items,
Tasks, or Time Blocks and Atlas does not persist them.

### CalendarProvider

The provider receives an exclusive start/end range and an IANA time zone. It
returns connection state, a user-facing status message, and normalized events.
Every provider is read-only in this sprint.

`ICSProvider` and `GoogleCalendarProvider` only specialize the common provider
kind. Authentication, fetching, parsing, refresh tokens, API clients, and sync
cursors deliberately do not appear in the Planner-facing contract.

### CalendarService

`CalendarService` decorates a concrete provider and itself implements
`CalendarProvider`. It:

- validates the requested range;
- removes malformed and out-of-range events;
- de-duplicates events by provider identity;
- sorts events deterministically;
- clones timestamps at the boundary;
- converts provider failures into a disconnected read-only snapshot so Atlas
  planning remains usable.

This keeps provider trust and normalization concerns outside `PlannerService`
while preserving the narrow dependency requested by planning.

## Current behavior

Production composes `MockCalendarProvider` with no events and a disconnected
state. It creates no demo data. The Daily Planner asks for the current local
day and shows the returned status or read-only events. External events do not
yet reduce the eight-hour availability baseline or create conflict warnings;
those are planning-engine policies, not integration-layer responsibilities.

## Future adapters

An ICS adapter can parse a supplied feed into `CalendarEvent` values and remain
read-only. A Google adapter can later own OAuth and Google API translation
behind `GoogleCalendarProvider`. Selecting either adapter changes composition,
not Planner code.

Before live integration, Atlas still needs authenticated ownership, encrypted
credential storage, permission scopes, refresh behavior, rate-limit handling,
incremental sync, freshness metadata, and privacy rules. Calendar writes should
use a separate explicit approval boundary rather than expanding this read port.

## Explicit non-goals

- No Google OAuth or authentication UI.
- No API keys, secrets, or environment variables.
- No ICS parsing or remote feed loading.
- No Google API client.
- No polling, webhooks, background jobs, or live sync.
- No external event writes.
- No conversion between Calendar events and Atlas work.
