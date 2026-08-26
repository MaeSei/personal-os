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
                    -> Prisma Area / Item / Daily Review / Daily Wrap-Up / Day Plan / Calendar repositories
                       -> Prisma Client -> PostgreSQL
                 -> ServiceContainer
                    -> application services
                       -> repository contracts + pure domain

PlannerService -> CalendarProvider
  -> CalendarService
     -> CalendarRepository -> PostgreSQL cache
     -> CalendarSyncProvider -> GoogleCalendarProvider -> Google Calendar API

Feature components/hooks -> AtlasFeatures contracts + presentation/domain types
Domain -> no React, Next.js, repository, network, or database dependency

AnalyticsService -> Review / Wrap-Up / Item repositories -> pure Analytics
PatternService -> Analytics + historical Review / Wrap-Up -> pure Patterns
RecommendationService -> Analytics + Patterns + CalendarProvider + current work

AssistantFeature -> AssistantService -> provider-neutral AIService
  -> optional server-only OpenAI structured-output adapter
```

The root route now renders Workspace. Its read-only path is:

```text
WorkspaceClient -> WorkspaceFeature -> WorkspaceService
  -> AreaRepository + ItemRepository + DayPlanRepository
  -> Prisma -> PostgreSQL

InboxRail -> InboxFeature -> InboxService -> repositories
UniversalCapture -> InboxFeature -> InboxService -> repositories

TaskDetailClient -> TaskFeature -> TaskService
  -> ItemRepository + AreaRepository -> Prisma -> PostgreSQL

ProjectDetailClient -> ProjectFeature -> ProjectService
  -> pure Project artifact operations -> ItemRepository -> Prisma -> PostgreSQL

DailyWrapUp -> WrapUpFeature -> WrapUpService
  -> DailyWrapUpRepository + DayPlanRepository + ItemRepository + CalendarProvider
  -> Prisma -> PostgreSQL
```

Workspace deliberately does not depend on `PlannerFeature`,
`CalendarProvider`, or AI services. It owns explicit daily commitment commands
against the same Day Plan repository that Planner uses; it never infers a plan
from Task status, dates, or schedules.

## Layer decisions

### Domain

`src/domain` owns Item, Area, Task, Project, status, Daily Review, Day Plans,
Time Blocks, availability, contexts, current Task estimates, attention, focus, Inbox
conversion, Project projections, and immutable tree operations.
It stays pure TypeScript so deterministic behavior can be tested without React,
Next.js, or PostgreSQL.

### Application

`src/application` owns use-case orchestration. Services are the only code that
uses repository contracts. `ServiceContainer` creates concrete services;
`ApplicationContainer` exposes only stable feature interfaces.

`src/application/container.ts` is server-only and is the single production
composition root. Repository and service instances never cross the React
Server Component serialization boundary.

The same root optionally selects `GoogleCalendarProvider` when all server-only
OAuth and encryption variables are present. `CalendarService` owns connection,
selection, synchronization, and cached projection orchestration, while
`PlannerService` still depends only on `CalendarProvider`; Google details cannot
enter planning code. UI commands depend on `CalendarFeature`, and OAuth redirect
routes use a separate server-only callback feature.

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

The primary Workspace follows the same rule: `WorkspaceService` assembles the
active Project horizon, reads ordered Day Plan commitments, and asks the pure
Context Engine to filter committed and available Task projections. Pure Daily
Workspace operations own placement, grouping, pinning, focus, and removal;
React owns transport state, drag events, filters, and disclosure. Inbox
processing remains on the existing Inbox feature rather than being duplicated.

The Task Workspace adds a canonical action boundary. `TaskService` owns Task
queries and lifecycle commands; `ProjectService` delegates its existing Task
operations to that service. Conversion into a Project remains a pure domain
tree transformation orchestrated by the service. UI handles disclosure,
confirmation, and navigation only.

Project Dashboard context follows the same boundary. Milestones, pinned notes,
and bidirectional related-Project markers remain Items in the Project tree.
`ProjectService` owns their commands, pure domain functions own refinement and
tree changes, and React owns disclosure and confirmation only. No special
client persistence or Project-specific repository was introduced.

Planning Suggestions follow the same inward dependency rule. The pure
`PlanningRulesEngine` owns lifecycle and prerequisite eligibility, duration,
energy and context scoring, deterministic slot placement, explanations, and
stable ordering. `PlannerService` supplies explicit planning context and maps
the result; UI can display or explicitly accept it but cannot schedule during
the read.

The pure `AvailabilityService` merges date-scoped working hours and subtracts
breaks, Atlas Time Blocks, and normalized busy Calendar occurrences. Calendar
providers own recurrence expansion; the engine owns overlap, all-day,
multi-calendar, and declined-event rules without importing provider code.
`PlannerService` injects that engine, projects its result for the UI, and
revalidates a Task drop before persisting the canonical Time Block.

Daily Wrap-Up keeps reflection separate from morning capacity. `WrapUpService`
assembles current Day Plan, Task, Focus Session, Time Block, and read-only
Calendar evidence; pure domain functions calculate and validate the immutable
snapshot. React cannot infer completion or persist carry-forward work. Only
explicitly selected unfinished Tasks enter tomorrow's Draft Day Plan.

Historical intelligence remains read-only and outside feature transport.
`AnalyticsService` assembles immutable history, `PatternService` applies
sample-gated deterministic rules, and `RecommendationService` combines those
results with provider-neutral Calendar and current work. Domain outputs contain
evidence and explanations but no executable command.

`src/ai` is a separate provider-neutral dependency-injection boundary. Its
optional server adapter produces structured proposals through OpenAI Responses;
`AssistantService` assembles scoped repository and deterministic evidence,
validates model output, and exposes previews through `AssistantFeature`.
Provider services have no repository or command access. Inbox filing and
selected Project acceptance re-enter application commands explicitly; briefing
and reflection remain read-only. See `docs/ai-service-layer.md`.

The Calendar Workspace composes that one projection into a calm Day Timeline:
read-only events, genuine Available Slots, and editable Atlas Time Blocks share
one visual region while retaining separate ownership. Projects and Today's
Tasks remain visible context. Responsive layout and disclosure stay in React;
availability, overlap validation, and scheduling remain outside the UI.

### Repositories

`src/repositories` contains persistence contracts and PostgreSQL
implementations.
Repositories map persistence shape to domain shape; they do not decide Inbox,
focus, planning, onboarding, or Project behavior.

Repository naming stays deliberately small:

- `get()` returns the current aggregate or latest record.
- `getHistory()` is explicit only where history is a domain requirement.
- Daily Review and Daily Wrap-Up both expose `getHistory()` for deterministic
  historical analysis; their write semantics remain immutable.
- `save(value)` persists a snapshot, or appends when the contract documents
  append-only semantics.
- `update()` and `delete()` are reserved for future record-level repository
  contracts and are not aliases for application commands.

`PrismaRepositoryFactory` is the only source file that instantiates production
repositories. `lib/prisma.ts` lazily creates one pooled Prisma Client per server
process, which prevents build-time connection attempts and development
hot-reload connection churn.

### External integrations

`src/calendar` owns the normalized `CalendarEvent` model, the planner-facing
read-only `CalendarProvider` port, the OAuth/sync `CalendarSyncProvider` port,
and the official `GoogleCalendarProvider` adapter. Atlas persists an encrypted
connection and a disposable read cache through `CalendarRepository`; external
events remain provider-owned and never become work records. Google access is
read-only, refresh tokens are AES-256-GCM encrypted, and OAuth callback state is
validated through an HttpOnly cookie. See `docs/calendar-integration.md`.

## Data invariants

- Tasks always have Areas and may optionally have Projects.
- Tasks may have several normalized contexts. The first value feeds legacy
  single-context compatibility; no context and `Anywhere` are executable in
  every current context.
- Task estimates separate optional duration, 1–5 effort, 1–5 energy, and
  optional confidence. They represent the current estimate only.
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
  references to Mission Control and Focus Session. Each commitment owns
  daily-only pinned, group, focused, elapsed-time, notes, and checklist state;
  at most one commitment is focused and service commands retain at most one
  running segment. Time Blocks remain persisted separately from Task status and
  duration estimates.
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
- OAuth, provider clients, encrypted credentials, and synchronization remain
  outside the Planner read port.
- Calendar writes remain unsupported; imported events are read-only.
- Tests may use in-memory repository implementations.
- AI providers are created only in the server composition root and never enter
  Client Components, repositories, or Prisma.

See `docs/current-architecture.md` for the complete runtime inventory and
`docs/database.md` for schema and migration operations.
