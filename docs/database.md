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
| `day_plan_tasks` | Ordered Task commitments within a Day Plan. |
| `time_blocks` | Typed, lockable attention reservations with explicit start/end boundaries and notes. |
| `time_block_tasks` | Many-to-many Time Block-to-Task links. |
| `time_block_projects` | Many-to-many Time Block-to-Project links. |

PostgreSQL enums store Area color, Item type, and Item status. Date-only domain
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

## Repository mapping

`PrismaAreaRepository` maps Area rows and preserves position.

`PrismaItemRepository` flattens recursive Item trees for writes and reconstructs
them by `parent_id` for reads. Project-specific fields are populated only for
Project rows. A serializable transaction performs scalar upserts, relationship
updates, and snapshot removal.

`PrismaDailyReviewRepository` always inserts. Latest and history reads order by
review date, creation time, and internal ID, all descending.

`PrismaDayPlanRepository` reads ordered commitments, chronologically ordered
Time Blocks, and Task/Project link rows into one domain aggregate. `save()`
upserts the plan, replaces ordered commitments, upserts/removes blocks, and
replaces their links in one transaction. No Planner read creates a row;
persistence starts with an explicit user action.

Task rows also store nullable `scheduled_start`, `scheduled_end`,
`estimated_duration`, `preferred_time`, and `preferred_context`. A check
constraint requires scheduled boundaries to be either both absent or a valid
increasing pair. The Sprint 7.3 migration copies legacy duration and context
values into their new canonical columns without deleting the compatibility
columns.

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
