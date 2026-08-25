# Atlas PostgreSQL persistence

## Schema

Prisma schema source lives in `prisma/schema.prisma`. Generated client code is
written to `src/generated/prisma` during install/build and is not committed.
`prisma.config.ts` supplies the CLI connection URL.

| Table | Purpose |
| --- | --- |
| `areas` | Ordered user-configured Areas. |
| `items` | Normalized Items, Projects, Tasks, and Inbox entries. |
| `daily_reviews` | Immutable historical Daily Review records. |
| `day_plans` | One user-authored plan per calendar date. |
| `day_plan_tasks` | Ordered Task commitments plus daily pin, group, focus, and Focus Session state. |
| `time_blocks` | Typed, lockable attention reservations with explicit start/end boundaries and notes. |
| `time_block_tasks` | Many-to-many Time Block-to-Task links. |
| `time_block_projects` | Many-to-many Time Block-to-Project links. |
| `calendar_connections` | Google account metadata, encrypted refresh credential, and sync status. |
| `connected_calendars` | Provider Calendar List metadata, Atlas selection, and sync cursor. |
| `cached_calendar_events` | Disposable normalized read-only provider event cache. |
| `daily_wrap_ups` | One immutable end-of-day reflection and metric snapshot per date. |
| `daily_wrap_up_tasks` | Historical Task outcome, estimate, actual Focus time, and carry-forward evidence. |

PostgreSQL enums store Area color, Item type, Item status, and Calendar sync
status. Date-only domain
values use `DATE`; activity timestamps use `TIMESTAMPTZ(3)`. Daily Review IDs
are internal increasing keys and do not enter the domain result.

Foreign keys use `RESTRICT` for Area deletion and `SET NULL` for generic Item
hierarchy/Project deletion. Application services remain responsible for
meaningful deletion flow; the database prevents orphaned Area assignments and
self-references.

Day Plan commitments cascade with their owning plan or referenced Task. Time
Block links cascade when either side is removed, while the Time Block itself
survives removal of linked work. PostgreSQL validates each block boundary;
cross-row overlap and Item-type validation remain domain/application rules.

Calendar metadata and cached events cascade with their encrypted connection.
Foreign-key columns are indexed, selected calendars have a compound lookup
index, and cached event range reads use `(calendar_id, start, end)`. Cached
event boundaries use `TIMESTAMPTZ(3)` and a database check enforces `end >
start`.

## Repository mapping

`PrismaAreaRepository` maps Area rows and preserves position.

`PrismaItemRepository` flattens recursive Item trees for writes and reconstructs
them by `parent_id` for reads. Project-specific fields are populated only for
Project rows. A serializable transaction performs scalar upserts, relationship
updates, and snapshot removal.

`PrismaDailyReviewRepository` always inserts. Latest and history reads order by
review date, creation time, and internal ID, all descending.

`PrismaDayPlanRepository` reads ordered commitments with daily metadata,
chronologically ordered Time Blocks, and Task/Project link rows into one domain
aggregate. `save()`
upserts the plan, replaces ordered commitments, upserts/removes blocks, and
replaces their links in one transaction. No Planner read creates a row;
persistence starts with an explicit user action.

`PrismaCalendarRepository` reads and writes the complete connection aggregate.
`save()` upserts account/calendar metadata and transactionally replaces the
normalized event cache; `delete()` removes the Google connection and relies on
cascades for credentials, cursors, and cached events. The repository sees only
the AES-GCM envelope, never a plaintext refresh token.

`PrismaDailyWrapUpRepository` reads one date-scoped historical snapshot or the
complete newest-first history and inserts Task evidence as nested rows. The
date is unique and `save()` never updates an earlier reflection. Snapshot Task
IDs intentionally have no Item foreign key, preserving the historical title
and outcome after Task deletion.

The Daily Wrap-Up migration adds `daily_wrap_ups`, `daily_wrap_up_tasks`, and
the plan/estimate assessment enums. It inserts no data and does not alter Item,
Day Plan, Time Block, or Calendar records. Aggregate counts and nonnegative
duration metrics are protected by database checks.

The Daily Workspace migration adds `is_pinned`, `is_focused`, and optional
`group_title` to commitment rows. A partial unique index allows at most one
focused Task per Day Plan; group titles are nonblank and limited to 60
characters. No Item row is backfilled or reclassified.

The Focus Session migration adds `focus_started_at`, nonnegative accumulated
`focus_elapsed_seconds`, optional `focus_notes`, and a JSON checklist array to
the same commitment row. Existing commitments receive an empty paused session.
The application validates checklist shape and limits; PostgreSQL also enforces
the elapsed-time, notes-length, and JSON-array boundaries. Timer ticks do not
write to PostgreSQL: pause, switch, and complete calculate the running segment
from the persisted start timestamp.

Task rows also store nullable `scheduled_start`, `scheduled_end`,
`estimated_duration`, `preferred_time`, and `preferred_context`. A check
constraint requires scheduled boundaries to be either both absent or a valid
increasing pair. The Sprint 7.3 migration copies legacy duration and context
values into their new canonical columns without deleting the compatibility
columns.

The Google Calendar migration adds the three Calendar tables and
`calendar_sync_status` without inserting data. It stores no access token and no
plaintext refresh-token column. The committed `down.sql` is for disposable
migration verification only; production reversal should use a forward fix.

The Sprint 7.2 migration is data preserving: it derives `end_minute` from the
previous `start_minute + duration_minutes`, classifies existing rows as Focus,
defaults them to unlocked, and copies the former optional Task foreign key into
`time_block_tasks` before retiring the old columns.

## Connection management

`src/lib/prisma.ts` creates Prisma lazily so static builds do not require a live
database. One client and one `pg` pool are reused per development server
process. Production creates one pool per application process with bounded
connections and timeouts.

For horizontally scaled deployments, total possible connections are roughly
`application instances × pool max`. Revisit the per-process maximum or add an
appropriate pooler before raising Railway replica count.

## Empty-install guarantee

There is no Prisma seed configuration or seed script. Migrations create schema
objects only. They do not insert Areas, Projects, Tasks, Inbox Items, or Daily
Reviews.

## Data migration boundary

This release changes the active persistence adapter but does not silently copy
legacy LocalStorage values. Browser data has no authenticated owner in the
current domain, so automatic server import would mix untrusted values into the
shared single-user database. If retention is required, implement a separate
one-time importer after authentication/ownership is defined.
