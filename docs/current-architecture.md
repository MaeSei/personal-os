# Atlas current architecture

Updated: 2026-08-25, after the Planning Workspace.

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
selects `PrismaRepositoryFactory` and the current `MockCalendarProvider`, while
`ServiceContainer` constructs the application services and exposes only
`AtlasFeatures`. The browser receives HTTP implementations of those interfaces
from `HttpFeatures.ts`.

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

Task planning metadata now distinguishes optional preferences from an accepted
schedule. `estimatedDuration`, `preferredTime`, and `preferredContext` guide a
manual decision but do not schedule work. `scheduledStart` and `scheduledEnd`
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

### Day Plan and Time Block

A Day Plan is one date-scoped, user-authored plan. It stores an ordered set of
Task commitments and zero or more Time Blocks. A commitment means the user
accepted a Task into the day; it does not rewrite the Task's status. A Time
Block stores its own title, start/end boundaries, type, lock state, notes, and
Task/Project links because a reservation is a planning decision, not a change
to a Task estimate or an external Calendar event.

Time Blocks may reference multiple Tasks and Projects or remain unassigned.
Blocks cannot overlap. Deleting or unlinking a block leaves its Tasks committed;
unscheduling and removing a Task are therefore distinct commands. Locked blocks
must be unlocked before their boundary is moved, resized, merged, split, or
deleted. A duplicate has a new identity and explicit start and begins unlocked.

## Application services

| Service | Responsibility |
| --- | --- |
| `MissionControlService` | Loads Areas, Items, latest review, focus plan, Inbox count, and grouped Projects into one render-ready result. |
| `InboxService` | Captures and triages one Inbox Item at a time. |
| `ProjectService` | Coordinates onboarding, Project workspaces, and Task commands. |
| `ManualBreakdownService` | Adds rapid-entry Project Tasks behind a replaceable breakdown contract. |
| `AreaService` | Reads and saves configured Areas. |
| `ReviewService` | Creates and appends dated Daily Review results and exposes history. |
| `FocusService` | Builds Focus Mode and completes Items. |
| `CalendarService` | Validates, normalizes, orders, and safely exposes read-only provider events. |
| `PlannerService` | Composes today's review, Projects, Tasks, Inbox summaries, Day Plan, Planning Rules results, available time, and read-only `CalendarProvider` evidence; owns draft/start lifecycle, single/batch Task acceptance, ordering, Time Blocking commands, and Task schedule projection. |

Application services are the only consumers of repository contracts. The API
route dispatches to feature contracts; it does not query Prisma or repositories
directly.

`PlanningRulesEngine` is a pure domain collaborator injected into
`PlannerService`. It excludes unavailable Tasks, selects active-Project next
actions, and deterministically prefers current-context and available-time fit.
It has no persistence or UI dependency.

Onboarding saves Areas before its first Project because PostgreSQL enforces the
Project-to-Area foreign key. This changes write order, not user-visible behavior.

## Repositories and transactions

The contracts remain intentionally small:

| Repository | Operations | PostgreSQL behavior |
| --- | --- | --- |
| `AreaRepository` | `get`, `save` | Ordered snapshot upsert and removal in one transaction. |
| `ItemRepository` | `get`, `save` | Rebuilds the domain tree on read; atomically upserts the flattened snapshot and relationships on save. |
| `DailyReviewRepository` | `get`, `getHistory`, `save` | Latest/history queries and append-only insert. |
| `DayPlanRepository` | `get(date)`, `save` | Loads one date-scoped plan and transactionally persists ordered commitments, typed Time Blocks, and their Task/Project links. |

Item snapshot writes use a serializable, short transaction. Rows are upserted
without self-relations first, relationships are connected second, and obsolete
rows are removed last. This supports arbitrary hierarchy order while foreign
keys remain enabled.

Database constraints enforce nonblank identities, valid score/rating ranges,
positive duration, nonnegative ordering, required Task/Project Areas, valid
Project shape, and non-self parent/Project references. Foreign-key columns and
the latest-review ordering path are indexed.

## UI data flow by screen

- Mission Control calls one feature query and renders the returned DTO.
- Inbox and Universal Capture call Inbox feature commands, then refresh through
  the same feature interface.
- Daily Review submits ratings and notes; the service appends the dated result.
- Morning Planning composes Review and Planner feature contracts into progressive
  steps. Its visible step is local UI state; the resumable draft and Start Day
  transition are application commands persisted in the Day Plan.
- Focus Mode loads a domain-derived focus plan and persists completion through
  `FocusService`.
- Onboarding reads Areas and persists selected Areas plus the first Project.
- Project overview/detail use `ProjectService`; metrics remain derived rather
  than denormalized database columns.
- The Planning Workspace calls `PlannerService` through the Planner feature contract.
  Native drag actions and accessible button controls invoke the same explicit
  place, reorder, schedule, resize, rename, duplicate, split, unschedule, and
  delete commands. Dragging into Schedule only preselects a Task; confirmation
  remains required.
- Workspace search, Task checkbox selection, and panel disclosure are local UI
  state. **Add selected** is one `placeTasks` service command and one Day Plan
  write, not a loop of repository mutations.
- Planner requests the current local day through `CalendarProvider`. The
  provider snapshot crosses the existing Planner DTO and is rendered read-only;
  no Calendar-specific browser command exists.
- Once a persisted Day Plan is `Started`, Mission Control and Focus Mode consume
  its accepted Task order. Drafts remain resumable but invisible to execution
  views; without a started plan those views retain the rule-based fallback.

All browser/server values cross a JSON boundary. The HTTP adapter revives domain
timestamps and external event `start`/`end` instants without converting
calendar-only date fields.

## Preserved code

- Domain constructors, runtime refinements, Attention Engine, focus planning,
  and Task-tree utilities remain persistence-independent.
- Application service and feature contracts are unchanged except for explicit
  Daily Review history.
- Mission Control, Inbox, onboarding, Review, Focus Mode, Project workspace,
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
- The Planner currently exposes an eight-hour planning window because no
  working-hours or Calendar availability policy exists. The empty mock provider
  is the current read-only adapter; injected events are shown as context but do
  not yet alter capacity or produce conflicts.
- Calendar adapters have no persistence, freshness, authentication, or live
  synchronization yet. `ICSProvider` and `GoogleCalendarProvider` are contracts,
  not implementations.
- Deterministic suggestions are advisory only. They rank actionable Project
  next actions and standalone Tasks, but never write to a Day Plan.
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
