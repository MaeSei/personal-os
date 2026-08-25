# Atlas architecture

Atlas points dependencies inward: UI depends on feature contracts, application
services depend on domain rules and repository contracts, and server adapters
implement persistence details.

## Dependency graph

```text
RootLayout
  -> ApplicationContainerProvider
     -> HTTP AtlasFeatures adapters
        -> /api/atlas route handler
           -> server-only applicationContainer
              -> ApplicationContainer
                 -> PrismaRepositoryFactory
                    -> Prisma Area / Item / Daily Review / Day Plan repositories
                       -> Prisma Client -> PostgreSQL
                 -> ServiceContainer
                    -> application services
                       -> repository contracts + pure domain

PlannerService -> CalendarProvider
  -> CalendarService -> configured calendar adapter

Feature components/hooks -> AtlasFeatures contracts + presentation/domain types
Domain -> no React, Next.js, repository, network, or database dependency
```

## Layer decisions

### Domain

`src/domain` owns Item, Area, Task, Project, status, Daily Review, Day Plans,
Time Blocks, attention, focus, Inbox conversion, Project projections, and
immutable tree operations.
It stays pure TypeScript so deterministic behavior can be tested without React,
Next.js, or PostgreSQL.

### Application

`src/application` owns use-case orchestration. Services are the only code that
uses repository contracts. `ServiceContainer` creates concrete services;
`ApplicationContainer` exposes only stable feature interfaces.

`src/application/container.ts` is server-only and is the single production
composition root. Repository and service instances never cross the React
Server Component serialization boundary.

The same root selects `MockCalendarProvider` for the current read-only Calendar
boundary. `CalendarService` normalizes provider output, and `PlannerService`
depends only on `CalendarProvider`; Google and ICS details cannot enter planning
or UI code.

### Feature transport and UI

`src/features/contracts` defines the capabilities UI may call. The browser
implementations in `src/features/http` serialize those calls to `POST
/api/atlas`. The route invokes the same feature contracts on the server.

This transport keeps existing Client Component flows intact while making
Prisma inaccessible to the browser bundle. It can later be replaced per use
case by Server Actions or server-loaded props without changing domain or
repository code.

The Planning Workspace is a representative split: `PlannerService` assembles
Projects, actionable Tasks, Inbox summaries, accepted work, Time Blocks,
capacity, and Calendar evidence; React owns only search text, Task selection,
and disclosure state. Multi-select acceptance returns through one feature
command rather than issuing repository writes from UI.

Planning Suggestions follow the same inward dependency rule. The pure
`PlanningRulesEngine` owns eligibility, context/time scoring, explanations, and
stable ordering. `PlannerService` supplies explicit planning context and maps
the result; UI only decides whether to display it.

### Repositories

`src/repositories` contains four contracts and PostgreSQL implementations.
Repositories map persistence shape to domain shape; they do not decide Inbox,
focus, planning, onboarding, or Project behavior.

Repository naming stays deliberately small:

- `get()` returns the current aggregate or latest record.
- `getHistory()` is explicit only where history is a domain requirement.
- `save(value)` persists a snapshot, or appends when the contract documents
  append-only semantics.
- `update()` and `delete()` are reserved for future record-level repository
  contracts and are not aliases for application commands.

`PrismaRepositoryFactory` is the only source file that instantiates production
repositories. `lib/prisma.ts` lazily creates one pooled Prisma Client per server
process, which prevents build-time connection attempts and development
hot-reload connection churn.

### External integrations

`src/calendar` owns the normalized `CalendarEvent` model, the read-only
`CalendarProvider` port, the current empty `MockCalendarProvider`, and future
ICS/Google provider specializations. Calendar providers are integrations, not
repositories: Atlas does not own or persist their events. See
`docs/calendar-integration.md`.

## Data invariants

- Tasks always have Areas and may optionally have Projects.
- Task scheduling is optional. Exact start/end values form a valid pair and
  project the earliest linked Time Block; preferences never create a schedule.
- Projects always have Areas and outcomes and never become focus Items.
- Inbox Ideas may be unassigned until triage.
- Item sibling order is persisted explicitly.
- date-only Task and Review values stay calendar dates, not local timestamps.
- Daily Reviews are immutable historical rows; latest is a query, not a
  singleton record.
- Day Plans are date-scoped planning aggregates. Drafts are resumable but remain
  invisible to execution views; `Started` plans publish their ordered Task
  references to Mission Control and Focus Mode. Time Blocks remain persisted
  separately from Task status and duration estimates.
- A Time Block has explicit local-day start/end boundaries, one supported type,
  a lock state, notes, and independent many-to-many Task and Project links.
- Time Blocks within a Day Plan may not overlap. Locked blocks protect their
  temporal boundary and must be unlocked before move, resize, merge, split, or
  deletion.
- derived Project metrics and focus plans are not persisted.

The domain validates these rules before writes, while PostgreSQL constraints
protect the stored representation from invalid values and broken references.

## Composition rules

- Feature UI must not import application or repository implementations.
- Client Components must not import Prisma or the server container.
- The API route calls application feature interfaces, never repositories.
- Application services receive repositories through constructors.
- Concrete repositories are created only in `PrismaRepositoryFactory`.
- Production persistence is selected only in `application/container.ts`.
- Planner imports only `CalendarProvider`, never a concrete Calendar adapter.
- OAuth, provider clients, and Calendar writes remain outside the read port.
- Tests may use in-memory repository implementations.

See `docs/current-architecture.md` for the complete runtime inventory and
`docs/database.md` for schema and migration operations.
