# Atlas current architecture

Updated: 2026-08-25, after Daily Wrap-Up.

This document describes the code that currently runs. Earlier sprint documents
may explain feature history, but this file and `docs/architecture.md` are
authoritative for runtime composition and persistence.

## Runtime summary

Atlas is a Next.js App Router application with a pure TypeScript domain,
application services, repository contracts, PostgreSQL repository adapters,
provider contracts, and feature-oriented React UI. Prisma is used only on the
server.

```text
Client feature UI
  -> AtlasFeatures contract
  -> HTTP feature adapter
  -> POST /api/atlas
  -> server-only ApplicationContainer
  -> application service
  -> repository contract
  -> Prisma repository
  -> Prisma Client + pg adapter
  -> PostgreSQL
```

Route files remain Server Components by default. Interactive screens are Client
Components because they own form, loading, and interaction state. They do not
import repositories, Prisma, or concrete services.

`src/application/container.ts` is the only production composition root. It
selects `PrismaRepositoryFactory` and, when configured, the official
`GoogleCalendarProvider`. `ServiceContainer` constructs the application
services and exposes only `AtlasFeatures`; the OAuth redirect routes receive a
separate server-only callback interface. The browser receives HTTP
implementations of UI-safe interfaces from `HttpFeatures.ts`.

## Domain and stored models

### Area

Areas are separate persisted records with `id`, `title`, `icon`, `color`,
`description`, and a storage-only position. Area order is stable. Inbox Ideas
may be unassigned; Tasks and Projects require an Area.

The onboarding catalogue in `initialAreas` is a set of user-selectable
templates. It is not a database seed. A fresh installation has no Area rows and
therefore enters onboarding.

### Item, Task, and Project

`Item` remains the compatibility envelope. PostgreSQL stores the recursive
aggregate as normalized rows in `items`:

- `parent_id` represents generic tree containment;
- `project_id` explicitly associates a Task with an optional Project;
- `sort_order` preserves sibling order;
- `area_id` references `areas`;
- date-only Task values use PostgreSQL `DATE` and remain `YYYY-MM-DD` in the
  domain;
- timestamps use timezone-aware PostgreSQL values and become JavaScript
  `Date` values at the feature boundary.

Projects are first-class outcome containers stored as Item rows with required
`outcome`, `energy_level`, and Area. They never enter focus directly. Tasks
always have an Area, may have a Project, and are the only actionable work.

Project Milestones, lightweight notes, and related-Project edges are also
Items. Namespaced runtime markers refine Workflow and Reference Items into
Project context without introducing parallel persistence. Milestones may own a
shallow ordered Task group; deleting a Milestone promotes its Tasks back to the
Project. Related-Project edges are symmetric context links, not dependencies.

Task planning metadata now distinguishes optional constraints and preferences
from an accepted schedule. `contexts` is the canonical normalized set of places
or tools where a Task can run; built-ins and custom strings share this one
model. `estimatedDuration`, `preferredTime`, and the primary compatibility
context guide a manual decision but do not schedule work. The current Task
estimate separates optional duration, 1–5 effort, 1–5 energy, and optional
Low/Medium/High confidence. It stores no actuals or estimate history.
`scheduledStart` and `scheduledEnd`
are a paired projection of the earliest linked block in today's Day Plan;
legacy `durationMinutes`, `context`, and `scheduledDate` remain readable during
the compatibility window.

Inbox entries are ordinary Item rows with `type: Idea`, `status: Inbox`, and no
required Area. Triage replaces the same row identity with a Task, Project,
Someday Item, or Reference, or removes it. There is no separate Inbox table and
no duplicate Inbox representation.

### Daily Review

Daily Reviews are historical, append-only records. Every completed review
stores:

- calendar `date`;
- `energy`, `stress`, and `motivation` ratings;
- optional normalized `notes`;
- deterministic `summary`;
- calculated `attentionBudget`;
- a database creation timestamp used to order multiple reviews on one day.

`DailyReviewRepository.get()` returns the latest record for existing consumers.
`getHistory()` returns all records newest first. `save()` always inserts and
never updates an earlier review.

### Daily Wrap-Up

Daily Wrap-Up is a separate, immutable end-of-day aggregate rather than a
second kind of morning Daily Review. One record per calendar date snapshots
the user's plan and estimate assessments, optional notes, aggregate completion
metrics, and per-Task title, outcome, estimate, recorded Focus Session duration,
and carry-forward decision. Snapshot Task IDs are deliberately not foreign
keys, so later Task edits or deletion cannot rewrite history.

Carry-forward is opt-in per unfinished Task. `WrapUpService` adds selected
identities to tomorrow's Draft Day Plan without copying Time Blocks, assigning
times, or changing Task status.

### Day Plan and Time Block

A Day Plan is one date-scoped, user-authored plan. It stores an ordered set of
Task commitments and zero or more Time Blocks. A commitment means the user
accepted a Task into the day; it does not rewrite the Task's status. Each
commitment stores daily-only pin, optional group, and current-focus metadata;
PostgreSQL permits at most one focused commitment per plan. A Time
Block stores its own title, start/end boundaries, type, lock state, notes, and
Task/Project links because a reservation is a planning decision, not a change
to a Task estimate or an external Calendar event.

Time Blocks may reference multiple Tasks and Projects or remain unassigned.
Blocks cannot overlap. Deleting or unlinking a block leaves its Tasks committed;
unscheduling and removing a Task are therefore distinct commands. Locked blocks
must be unlocked before their boundary is moved, resized, merged, split, or
deleted. A duplicate has a new identity and explicit start and begins unlocked.

### Google Calendar connection and cache

Atlas stores one optional single-user Google connection. The row contains
account metadata, sync status/timestamps, and an AES-256-GCM encrypted refresh
token envelope. Access tokens are never persisted. Child rows store Calendar
List metadata, explicit Atlas selection, per-calendar sync tokens, and a
normalized event cache. Deleting the connection cascades through all cached
provider data.

The cache is read-only provider evidence. Cached events never become Items,
Tasks, or Time Blocks, and Atlas cannot write to Google Calendar. Event instants
are stored with time zone awareness; all-day dates are normalized at the Google
adapter boundary using the source calendar's IANA time zone.

## Application services

| Service | Responsibility |
| --- | --- |
| `MissionControlService` | Loads Areas, Items, latest review, focus plan, Inbox count, and grouped Projects into one render-ready result. |
| `InboxService` | Captures and triages one Inbox Item at a time. |
| `ProjectService` | Coordinates onboarding and Project workspaces, including Milestones, pinned notes, related Projects, and Task grouping; delegates canonical Task lifecycle commands to `TaskService`. |
| `TaskService` | Loads one Task with Area/Project context and owns edit, assignment, detach, duplicate, delete, conversion, creation, and reordering commands. |
| `ManualBreakdownService` | Adds rapid-entry Project Tasks behind a replaceable breakdown contract. |
| `AreaService` | Reads and saves configured Areas. |
| `ReviewService` | Creates and appends dated Daily Review results and exposes history. |
| `FocusService` | Builds Focus Session, owns its generic timer, notes, checklist, deliberate Task switching, and Task completion. |
| `CalendarService` | Owns Google connection, encrypted credential orchestration, calendar selection, incremental synchronization, cached provider-neutral reads, refresh, and disconnect. |
| `PlannerService` | Composes today's review, Projects, Tasks, Inbox summaries, Day Plan, Planning Rules and Availability results, and read-only `CalendarProvider` evidence; owns draft/start lifecycle, single/batch Task acceptance, available-slot scheduling, ordering, Time Blocking commands, and Task schedule projection. |
| `WorkspaceService` | Builds the complete active Project horizon and explicit date-scoped Daily Workspace; owns placement, ordering, pin, group, focus, removal, and archive orchestration without Calendar or AI behavior. |
| `AnalyticsService` | Produces a deterministic historical report from Review, Wrap-Up, and current Item evidence. It is service-only and not exposed to UI yet. |
| `PatternService` | Applies sample-gated rules to historical Atlas evidence and omits unsupported inferences. |
| `RecommendationService` | Combines Analytics, Patterns, read-only Calendar, current Review, Projects, and Tasks into explained suggestions with no execution path. |
| `AssistantService` | Assembles scoped evidence, invokes optional AI capability ports, validates proposals, exposes read-only briefings/reflections, and atomically persists only explicitly selected Project suggestions. |

Application services are the only consumers of repository contracts. The API
route dispatches to feature contracts; it does not query Prisma or repositories
directly.

The contracts in `src/ai` remain provider-neutral. The production composition
root optionally instantiates a server-only OpenAI structured-output adapter for
Project breakdown, Inbox classification, briefing, and reflection. Conversation
and AI planning remain unimplemented. UI sees only `AssistantFeature`; provider
credentials and implementations never cross the server boundary.

`PlanningRulesEngine` is a pure domain collaborator injected into
`PlannerService`. It excludes unavailable or dependency-bound Tasks, selects
active-Project next actions, ranks duration, energy, context, date, and impact,
then proposes non-overlapping placements inside supplied Available Slots. It
has no persistence or UI dependency; the user must invoke a separate Planner
command before a proposal becomes a Time Block.

The Planner UI now composes Calendar events, Available Slots, and Time Blocks
inside one Day Timeline. This is a presentation boundary only: external events
remain read-only provider evidence, Available Slots remain a pure calculation,
and Time Blocks remain persisted Atlas intent. Projects and Today's Tasks stay
visible in the same responsive workspace. See `docs/calendar-workspace.md`.

`ContextEngine` is pure domain logic used by Workspace and Planning Rules. It
normalizes built-ins/custom values, derives legacy compatibility, determines
context eligibility, and combines Context, Area, Project, energy, duration, and
status filters without changing Task order or persistence.

`EffortModel` is a pure current-value projection. It gives duration, effort,
energy, and confidence stable meanings without changing Attention behavior or
introducing comparison/history records.

`AvailabilityService` is pure date- and time-zone-scoped domain logic. It
merges working windows, then subtracts breaks, Atlas Time Blocks, and normalized
busy Calendar occurrences. Declined and transparent events remain available;
all-day, overlapping, recurring occurrences, and multiple selected calendars
share the same interval rules.

Planner injects this domain service and exposes whole-minute Available Slots.
`scheduleTaskInSlot` re-reads Calendar and Day Plan constraints, validates that
the Task estimate fits, creates one linked Focus block, and synchronizes the
Task's scheduled timestamps. The Task lifecycle status is never rewritten.

Onboarding saves Areas before its first Project because PostgreSQL enforces the
Project-to-Area foreign key. This changes write order, not user-visible behavior.

## Repositories and transactions

The contracts remain intentionally small:

| Repository | Operations | PostgreSQL behavior |
| --- | --- | --- |
| `AreaRepository` | `get`, `save` | Ordered snapshot upsert and removal in one transaction. |
| `ItemRepository` | `get`, `save` | Rebuilds the domain tree on read; atomically upserts the flattened snapshot and relationships on save. |
| `DailyReviewRepository` | `get`, `getHistory`, `save` | Latest/history queries and append-only insert. |
| `DayPlanRepository` | `get(date)`, `save`, `delete(date)` | Loads and persists one date-scoped plan. Delete supports confirmed Morning draft discard; PostgreSQL cascades its commitments, typed Time Blocks, and links. |
| `CalendarRepository` | `get`, `save`, `delete` | Transactionally persists the encrypted connection aggregate, selected calendars, sync cursors, and disposable event cache. |
| `DailyWrapUpRepository` | `get(date)`, `getHistory`, `save` | Loads one date, reads history newest first, or inserts one immutable historical wrap-up. |

Item snapshot writes use a serializable, short transaction. Rows are upserted
without self-relations first, relationships are connected second, and obsolete
rows are removed last. This supports arbitrary hierarchy order while foreign
keys remain enabled.

Database constraints enforce nonblank identities, valid score/rating ranges,
positive duration, nonnegative ordering, required Task/Project Areas, valid
Project shape, and non-self parent/Project references. Foreign-key columns and
the latest-review ordering path are indexed.

## UI data flow by screen

- Workspace is the root screen. It calls `WorkspaceFeature` for Projects and
  current-day Task context, and reuses `InboxFeature` for one-at-a-time triage.
  Successful triage refreshes the read-only Workspace projection.
- The Project rail includes `Active`, `Waiting`, and `Blocked` Projects, groups
  them in persisted Area order, and derives all metrics through the existing
  Project projection. Area collapse is local UI state.
- Today's Workspace reads only explicit Day Plan commitments. Status and
  scheduling never auto-fill it. It separates pinned work and user-authored
  groups, preserves one global order, exposes the current focus, and offers a
  filtered pool of available Tasks. The Project horizon stays complete.
- Mission Control's service and components remain for compatibility, but the
  root route no longer renders them.
- Inbox and Universal Capture call Inbox feature commands, then refresh through
  the same feature interface.
- Daily Review submits ratings and notes; the service appends the dated result.
- Daily Wrap-Up combines the current Day Plan, Task statuses, Focus Session
  durations, Time Blocks, and read-only Calendar through `WrapUpService`. It
  snapshots confirmed reflection data and only carries explicitly selected
  unfinished Tasks into tomorrow's Draft.
- Morning Planning composes Review and Planner feature contracts into Greeting,
  Review, Calendar, Available Time, Today, Time Blocks, and confirmation. Its
  visible step is local UI state; save, resume, confirmed discard, and Start
  Day are application commands persisted through the Day Plan boundary.
- Focus Session reads the focused commitment from the accepted Day Plan.
  `FocusService` persists elapsed time, notes, checklist steps, deliberate Task
  switching, and completion through existing repository contracts. The browser
  renders the running segment locally but every authoritative timestamp comes
  from the service.
- Onboarding reads Areas and persists selected Areas plus the first Project.
- Project overview/detail use `ProjectService`; metrics remain derived rather
  than denormalized database columns.
- Project Dashboard derives progress from explicit Milestones when present and
  labels Task completion as evidence otherwise. Project context commands use
  Item-backed domain refinements and the existing repository boundary.
- Task detail uses `TaskFeature` and `TaskService` for one canonical action
  workspace. Workspace, Project, and Planner Task titles link to it. React
  coordinates forms and post-command navigation but performs no repository or
  relationship logic.
- The Planning Workspace calls `PlannerService` through the Planner feature contract.
  Native drag actions and accessible button controls invoke the same explicit
  place, reorder, schedule, resize, rename, duplicate, split, unschedule, and
  delete commands. Dragging into Schedule only preselects a Task; confirmation
  remains required.
- Planning Workspace search, Task checkbox selection, and panel disclosure are local UI
  state. **Add selected** is one `placeTasks` service command and one Day Plan
  write, not a loop of repository mutations.
- Planner requests the current local day through `CalendarProvider`. The
  provider snapshot crosses the existing Planner DTO and is rendered read-only;
  the Planner never imports Google APIs. A separate Calendar panel uses
  `CalendarFeature` to connect, choose calendars, refresh, and disconnect.
- Google OAuth begins at `/api/calendar/google/connect`. The callback validates
  a random state value stored in an HttpOnly SameSite cookie before exchanging
  the code through the server-only Calendar callback feature.
- Manual refresh and a five-minute Planner timer invoke the same service sync.
  Stale server reads also refresh on demand, avoiding reliance on an in-process
  Railway cron. HTTP 410 sync cursors cause a per-calendar full resync; deleted
  provider events and calendars are removed from the cache.
- Once a persisted Day Plan is `Started`, Mission Control and Focus Session consume
  its accepted Task order. Drafts remain resumable but invisible to execution
  views; without a started plan those views retain the rule-based fallback.

All browser/server values cross a JSON boundary. The HTTP adapter revives domain
timestamps and external event `start`/`end` instants without converting
calendar-only date fields.

## Preserved code

- Domain constructors, runtime refinements, Attention Engine, focus planning,
  and Task-tree utilities remain persistence-independent.
- Application and feature contracts remain narrow; the current additions are
  explicit Daily Review history and the read-only Workspace query.
- Workspace, Mission Control, Inbox, onboarding, Review, Focus Session, Project workspace,
  Universal Capture, and the design system are reused without repository
  imports.
- In-memory repositories remain for fast service tests.

## Retired code

- `LocalStorageRepository` and `LocalStorageRepositoryFactory` are removed.
- The browser no longer instantiates repositories or application services.
- The previous single-value Daily Review format is retired.
- No demo arrays, seed script, seeded Areas, Projects, Tasks, or Inbox Items are
  part of production persistence.

## Current limits and migration risks

- Atlas is still designed for one private user and has no authentication or
  ownership column. Exposing it publicly without access control exposes the
  same dataset to every visitor.
- Existing data in a browser's former LocalStorage keys is not uploaded
  automatically. Importing legacy browser data requires an explicit,
  authenticated migration flow before those values can be trusted by a server.
- Item and Area repositories retain whole-aggregate `get/save` contracts for
  behavioral compatibility. They are simple but can cause contention or lost
  intent under concurrent writers; record-level commands are the next scaling
  boundary.
- Cross-repository onboarding is ordered but is not one database transaction
  because existing contracts expose independent repositories.
- Planner scheduling persists the Day Plan before synchronizing the Task's
  primary scheduled projection through `ItemRepository`. These writes are
  ordered but not one cross-repository transaction. The Time Block remains
  canonical if the projection write must be retried.
- The internal feature route relies on application/domain validation. A public
  multi-user version should add authenticated authorization, CSRF protection,
  request schemas, and per-user filtering.
- Planner availability uses a 09:00–17:00 local working window and no breaks in
  the production composition. Calendar events and Time Blocks reduce that
  window now, but the working-hour and break policy is not yet user-configurable.
- Google synchronization is request-driven: stale Planner reads and the open
  Planner's five-minute timer refresh it. There is no independent queue worker,
  webhook, push channel, or cross-instance sync lock yet.
- Calendar connection rows have no user ownership because Atlas still has no
  authentication. A public or multi-user deployment must add authorization and
  per-user connection ownership before Calendar access is safe.
- Google Calendar is read-only. Atlas does not publish Time Blocks or Tasks to
  any external calendar, and the ICS provider remains only an interface.
- Deterministic suggestions are advisory only. They rank actionable Project
  next actions and standalone Tasks, but never write to a Day Plan.
- Custom contexts are Task-owned strings, not catalogue records. An unused
  custom value therefore disappears from filter options until another Task uses it.
- Workspace has no Task completion action, Calendar projection, or AI
  assistance. It mutates daily intent through the Day Plan and global archive
  through the Item repository.
- Focus Session completion writes the Day Plan before the Item snapshot. These
  repositories do not yet share a transaction, so a failed second write may
  require a retry. The Task remains current globally until that write succeeds.
- Task dependencies, dedicated notes, completion timestamps, and an event log
  are not modeled. Task detail exposes honest empty extension points and labels
  `updatedAt` as the best available completion time instead of inventing data.
- Estimate history and actual-versus-estimate analysis are not modeled. Task
  metadata represents only the latest user-authored estimate.
- Project notes have no version history, Milestones are intentionally shallow,
  and related Projects communicate context rather than executable dependency
  semantics.
- A production migration must run against a backed-up database before the new
  application instance becomes healthy.

## Next migration sequence

1. Provision PostgreSQL and run the committed initial migration.
2. Verify an empty database enters onboarding and creates Area/Project/Task
   rows without seeds.
3. Smoke-test Review history, Inbox triage, Focus completion, and Project edits.
4. Add authentication and a user/ownership model before multi-user access.
5. Introduce record-level repository commands where concurrent writes become a
   real requirement.
6. Build a separate, explicit legacy-browser import only if old production data
   must be retained.
