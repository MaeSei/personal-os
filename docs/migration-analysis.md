# Atlas migration compatibility analysis

Analysis date: 26 August 2026

## Executive finding

`20260825190000_context_engine` fails because it compares PostgreSQL enum
column `items.type` with the label `'TASK'`, while the preceding migration
history created the `item_type` label as `'Task'`. PostgreSQL enum labels are
case-sensitive, so it rejects the literal before it can evaluate any rows.

This is a **case-sensitivity defect in one migration literal**. It is not an
enum recreation, an intentional rename, a migration-ordering defect, or a
repository/application mismatch. No committed migration before the repair
renames, recreates, or adds values to `item_type`.

The safe repair is one new compatibility migration ordered immediately before
the Context Engine migration. It renames the stored enum label from `Task` to
`TASK`, while Prisma maps its unchanged logical `ItemType.Task` member to the
database label with `@map("TASK")`.

## Evidence and inspection limits

The audit read:

- `AGENTS.md`;
- `docs/database.md` and `docs/current-architecture.md`;
- the complete current `prisma/schema.prisma`;
- every `migration.sql`, every committed `down.sql`, and
  `migration_lock.toml` under `prisma/migrations`;
- the domain Item enum, Prisma Item repository, migration tests, Atlas Doctor,
  package scripts, and Prisma 7.9.1 dependency versions.

No `DATABASE_URL` or `DIRECT_URL` is available in this checkout, so the live
Railway `pg_catalog.pg_enum` rows could not be queried. The reported PostgreSQL
error proves that `TASK` is not a valid `item_type` label at the failure point.
The committed initial migration proves that an unmodified Atlas database has
`Task` instead. There is no repository evidence of a manual edit.

A read-only live verification query is:

```sql
SELECT
  enum_type.typname,
  enum_value.enumsortorder,
  enum_value.enumlabel
FROM pg_catalog.pg_enum AS enum_value
JOIN pg_catalog.pg_type AS enum_type
  ON enum_type.oid = enum_value.enumtypid
JOIN pg_catalog.pg_namespace AS enum_schema
  ON enum_schema.oid = enum_type.typnamespace
WHERE enum_schema.nspname = 'public'
ORDER BY enum_type.typname, enum_value.enumsortorder;
```

This query is diagnostic only; the repair does not require a manual database
edit.

## `item_type` timeline

| Order | Migration/schema | Event |
| --- | --- | --- |
| 1 | `20260824000000_initial_postgresql` | Creates `item_type` as `Task`, `Project`, `Workflow`, `Reference`, `Idea`, `Reminder`, `Review`. Its constraints also use `Task` and `Project`. |
| 2 | `20260825090000_task_scheduling` | Correctly filters existing Task rows with `WHERE type = 'Task'`. It does not change the enum. |
| 3 | `20260825140000_morning_workflow` | Does not reference `item_type`. |
| 4 | `20260825185000_item_type_task_compatibility_repair` | New repair: safely renames the existing `Task` label to `TASK` before Context Engine runs. |
| 5 | `20260825190000_context_engine` | Untouched historical migration filters with `WHERE type = 'TASK'`; after the repair this is valid and matches every existing Task row. |
| 6 | Later committed migrations | Do not reference or evolve `item_type`. |
| 7 | Current Prisma schema | Keeps logical `ItemType.Task` and maps it to database label `TASK`; all other logical/database labels remain identical. |

PostgreSQL stores enum values by internal identity. Renaming a label preserves
the value identity used by existing rows and parsed check constraints; it does
not rewrite or delete Item rows.

## Enum values expected by the repaired schema

| PostgreSQL enum | Prisma logical values | Stored PostgreSQL labels |
| --- | --- | --- |
| `area_color` | `amber`, `green`, `neutral` | `amber`, `green`, `neutral` |
| `item_type` | `Task`, `Project`, `Workflow`, `Reference`, `Idea`, `Reminder`, `Review` | `TASK`, `Project`, `Workflow`, `Reference`, `Idea`, `Reminder`, `Review` |
| `item_status` | `Active`, `Inbox`, `Today`, `Waiting`, `Blocked`, `Someday`, `Completed`, `Archived` | Same as logical values |
| `time_block_type` | `Focus`, `Meeting`, `Break`, `Travel`, `Admin`, `Personal`, `Flexible` | Same as logical values |
| `day_plan_status` | `Draft`, `Started` | `DRAFT`, `STARTED` |
| `preferred_time` | `Anytime`, `Morning`, `Afternoon`, `Evening` | Same as logical values |
| `estimate_confidence` | `Low`, `Medium`, `High` | Same as logical values |
| `calendar_sync_status` | `Idle`, `Syncing`, `Success`, `Error` | `IDLE`, `SYNCING`, `SUCCESS`, `ERROR` |
| `plan_assessment` | `AsPlanned`, `Partly`, `Differently` | Same as logical values |
| `estimate_assessment` | `Accurate`, `Mixed`, `Inaccurate`, `NotEnoughData` | Same as logical values |

## Enum values referenced by migration history

| Migration | Enum/type | Labels referenced |
| --- | --- | --- |
| Initial PostgreSQL | `area_color` | `amber`, `green`, `neutral` |
| Initial PostgreSQL | `item_type` | `Task`, `Project`, `Workflow`, `Reference`, `Idea`, `Reminder`, `Review`; constraints reference `Task` and `Project` |
| Initial PostgreSQL | `item_status` | `Active`, `Inbox`, `Today`, `Waiting`, `Blocked`, `Someday`, `Completed`, `Archived` |
| Time Blocking Engine | `time_block_type` | `Focus`, `Meeting`, `Break`, `Travel`, `Admin`, `Personal`, `Flexible` |
| Task Scheduling | `preferred_time` | `Anytime`, `Morning`, `Afternoon`, `Evening`; data filter references `Task` |
| Morning Workflow | `day_plan_status` | `DRAFT`, `STARTED` |
| Compatibility repair | `item_type` | Renames `Task` to `TASK` |
| Context Engine | `item_type` | References `TASK` |
| Effort Model | `estimate_confidence` | `Low`, `Medium`, `High` |
| Google Calendar | `calendar_sync_status` | `IDLE`, `SYNCING`, `SUCCESS`, `ERROR` |
| Daily Wrap-Up | `plan_assessment` | `AsPlanned`, `Partly`, `Differently` |
| Daily Wrap-Up | `estimate_assessment` | `Accurate`, `Mixed`, `Inaccurate`, `NotEnoughData` |

The Daily Planner, Daily Workspace, Focus Session, and rollback artifacts add
no other enum labels.

## Root-cause classification

| Candidate | Finding |
| --- | --- |
| Case sensitivity | **Root cause.** PostgreSQL treats `Task` and `TASK` as distinct enum labels. |
| Renamed enum | Not before the failure. The new repair deliberately renames one label to make the immutable history executable. |
| Recreated enum | No. Only the initial migration creates `item_type`; its rollback is not part of forward deployment. |
| Manual edit | No repository evidence. A live catalogue query was unavailable, but the error is fully explained without one. |
| Migration ordering | Not the original cause. Ordering is used intentionally by the repair so it executes before the defective historical migration. |
| Application mismatch | No. Domain code consistently uses logical `ItemType.Task`; Prisma mapping keeps that API unchanged. |

## The one safe repair

The new migration is
`20260825185000_item_type_task_compatibility_repair/migration.sql`. Its timestamp
places it after the last successfully applied migration and before the failed
Context Engine migration.

It runs in an explicit PostgreSQL transaction and performs two guarded steps:

1. If Prisma 7's failed attempt left `items.contexts` behind, verify that every
   array is empty and only then remove that partial column. If any non-empty
   value exists, abort the entire repair without changing anything.
2. Require exactly one of the `Task`/`TASK` labels, then rename `Task` to `TASK`
   when needed. An already repaired `TASK` state is accepted; an ambiguous or
   unknown state aborts rather than guessing.

After it commits, the original Context Engine migration runs unchanged: it
adds `contexts`, backfills existing Task rows from `preferred_context` or
`context`, and adds its nonblank-array constraint.

## Production recovery sequence

Take a normal Railway/PostgreSQL backup or snapshot first. Do not reset the
database and do not run any `down.sql` file.

For the deployment that already contains the failed migration record:

```bash
npx prisma migrate status
npx prisma migrate resolve --rolled-back 20260825190000_context_engine
npm run db:migrate:deploy
npx prisma migrate status
```

`migrate resolve --rolled-back` changes only Prisma's failed-migration ledger
state so the migration may be retried. The next deploy applies the newly
inserted repair first, retries the untouched Context migration, then continues
with later migrations. A fresh installation follows the same file order and
needs no `resolve` command.

## Why this preserves production data

- `ALTER TYPE ... RENAME VALUE` preserves the enum value identity and every
  Item row that uses it.
- No Item, Area, Project, Task, Review, Plan, Time Block, or Calendar row is
  deleted or recreated.
- The only conditional column removal targets the partial `contexts` column
  created immediately before the reported failure. It proceeds only when all
  arrays are empty; canonical legacy `context` and `preferred_context` values
  remain intact for the original backfill.
- The repair is transactional, so a guard or rename failure rolls back its
  preceding work.
- No applied migration file is edited and no migration is deleted.

## Rollback strategy

Do not reverse this repair in place: the committed Context migration requires
the `TASK` label during every future history replay.

If the persistence label ever needs to return to `Task`, use a **new forward
migration after Context Engine** that renames `TASK` to `Task`, and change the
Prisma `@map` in the same release. Rehearse that release against a restored
production snapshot before deployment. The logical application value remains
`ItemType.Task` on both sides, so no business behavior or Item data needs to be
rolled back.

For a failure of the new compatibility migration itself, inspect its error and
leave the database untouched. Its explicit transaction guarantees all-or-none
execution; after correcting the external condition, mark only that failed
migration as rolled back with `prisma migrate resolve` and redeploy. Never reset
production.

## Validation performed

The repair was validated without connecting to or modifying a database:

| Command | Result |
| --- | --- |
| `npm run db:validate` | Passed; the repaired Prisma schema is valid. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm test` | Passed; 135 tests, including migration order, partial-column guard, enum rename, and Prisma mapping coverage. |
| `npm run build` | Passed; Prisma Client generation and the production Next.js build completed successfully. |
| `git diff --check` | Passed. |

A live migration rehearsal was not possible because this checkout has no
`DATABASE_URL` or `DIRECT_URL`. Before production deployment, rehearse the
documented recovery sequence against a restored production snapshot.

## References

- [PostgreSQL enum labels are case-sensitive](https://www.postgresql.org/docs/15/datatype-enum.html).
- [PostgreSQL supports renaming an enum value with `ALTER TYPE`](https://www.postgresql.org/docs/17/sql-altertype.html).
- [Prisma's failed-migration recovery workflow](https://docs.prisma.io/docs/orm/prisma-migrate/workflows/patching-and-hotfixing).
- [Prisma CLI reference for `migrate resolve`](https://docs.prisma.io/docs/cli/migrate/resolve).
- [Prisma Migrate transaction behavior on PostgreSQL](https://www.prisma.io/blog/prisma-migrate-dx-primitives).
