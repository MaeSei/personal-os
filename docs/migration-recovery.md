# Atlas Context Engine migration recovery

Recovery analysis date: 26 August 2026

## Executive decision

Migration `20260825190000_context_engine` failed on its `UPDATE` statement
because the database enum label was `Task`, while the migration compared the
enum column with `TASK`. PostgreSQL enum labels are case-sensitive.

The failed migration must be marked **rolled back**, not applied. Prisma can
then apply the existing
`20260825185000_item_type_task_compatibility_repair` migration and retry the
unchanged Context Engine migration through the normal `migrate deploy`
workflow.

No additional migration is required for this recovery. Do not edit the failed
migration, run its `down.sql`, modify `_prisma_migrations` directly, or reset
the database.

## Inspection scope and evidence limits

This analysis inspected:

- the complete current Prisma schema;
- every `migration.sql`, `down.sql`, and `migration_lock.toml` artifact under
  `prisma/migrations`;
- `docs/database.md`, `docs/current-architecture.md`, and the historical
  database diagnostic;
- the current Prisma scripts and configuration.

The production database is not reachable from this checkout because no
`DATABASE_URL` or `DIRECT_URL` is available. The exact production migration
ledger must therefore be confirmed with `prisma migrate status` in the Atlas
Railway service environment before running `migrate resolve`.

## Failed migration statement review

The migration contains three statements.

### Statement 1: add `contexts`

```sql
ALTER TABLE "items"
  ADD COLUMN "contexts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
```

This statement is valid against the preceding schema. On PostgreSQL, Prisma 7
does not automatically wrap the entire migration file in one transaction, so
this statement may have committed before the later failure. If it committed,
every existing row received an empty array.

### Statement 2: backfill Task contexts

```sql
UPDATE "items"
SET "contexts" = ARRAY[
  COALESCE(
    NULLIF(BTRIM("preferred_context"), ''),
    NULLIF(BTRIM("context"), '')
  )
]
WHERE "type" = 'TASK'
  AND COALESCE(
    NULLIF(BTRIM("preferred_context"), ''),
    NULLIF(BTRIM("context"), '')
  ) IS NOT NULL;
```

This is the statement that failed. `items.type` uses PostgreSQL enum
`item_type`. The initial migration created its Task label as `Task`, and no
earlier migration renamed or recreated that enum. PostgreSQL attempts to cast
the literal `TASK` to `item_type` while planning the comparison and rejects it
with:

```text
invalid input value for enum item_type: "TASK"
```

The statement cannot partially backfill rows: PostgreSQL rejects the enum
literal before the update can execute.

### Statement 3: add the nonblank constraint

```sql
ALTER TABLE "items"
  ADD CONSTRAINT "items_contexts_nonblank_check"
  CHECK (array_position("contexts", '') IS NULL);
```

This statement was not reached after Statement 2 failed. The database may
therefore contain the empty `contexts` column, but it does not contain the
backfill or this constraint from the failed attempt.

## Root cause

The root cause is a case-sensitive enum literal mismatch:

```text
20260824000000_initial_postgresql
  creates item_type label: Task

20260825190000_context_engine
  compares items.type with: TASK
```

It is not caused by migration ordering, an enum recreation, application
business logic, or a documented manual database edit. The compatibility
migration was introduced after the failure specifically to make the immutable
history executable.

## Current migration history

### Repository order

| Order | Migration | Relevant state |
| --- | --- | --- |
| 1 | `20260824000000_initial_postgresql` | Creates `item_type` with `Task`. |
| 2 | `20260824150000_daily_planner` | Unrelated; expected applied before the failure. |
| 3 | `20260824180000_time_blocking_engine` | Unrelated; expected applied before the failure. |
| 4 | `20260825090000_task_scheduling` | Correctly compares the enum with `Task`. |
| 5 | `20260825140000_morning_workflow` | Last migration expected to have completed before the failure. |
| 6 | `20260825185000_item_type_task_compatibility_repair` | New, pending repair ordered before Context Engine. |
| 7 | `20260825190000_context_engine` | Recorded failed in the reported production deployment. |
| 8–12 | Later migrations | Pending until the failed record is resolved and preceding migrations succeed. |

### Production ledger

The error strongly implies a failed `_prisma_migrations` record for Context
Engine, but this report does not infer its complete contents. Confirm it with:

```bash
npm run db:migrate:status
```

Continue only if Prisma reports
`20260825190000_context_engine` as failed. `migrate resolve` is valid only for
a failed migration. If Prisma reports that migration as successfully applied,
stop and verify that the command is targeting the intended database.

## Recovery decision

| Option | Decision | Reason |
| --- | --- | --- |
| Retry immediately | No | Prisma blocks deployment while a failed migration record exists, and the original enum mismatch would remain without the compatibility migration. |
| Add another migration | No | The committed compatibility migration already repairs both possible partial states. |
| Mark rolled back | **Yes** | This is Prisma's supported way to allow a failed migration to be retried after its cause and partial state are handled. |
| Mark applied | No | The context backfill and constraint did not complete, so marking it applied would make migration history lie about the schema. |
| Run `down.sql` | No | It is unnecessary and would be a separate manual schema operation outside this recovery path. |

## Existing compatibility migration

`20260825185000_item_type_task_compatibility_repair` is intentionally ordered
between the last successful migration and Context Engine. In one explicit,
short PostgreSQL transaction it:

1. detects whether the failed attempt left `items.contexts` behind;
2. refuses to remove that column if any row contains a non-empty array;
3. removes only the provably empty partial column so the original `ADD COLUMN`
   can be retried;
4. verifies the exact `Task`/`TASK` enum state;
5. renames `Task` to `TASK` when necessary, preserving every Item row and enum
   value identity.

The Prisma schema maps the unchanged logical API member `ItemType.Task` to the
stored label `TASK`. Application-facing behavior remains unchanged.

## Exact production recovery

### Preconditions

1. Ensure the Atlas service is running the release that contains commit
   `489bb7f` and the compatibility migration.
2. Take a normal PostgreSQL/Railway backup or snapshot.
3. Run the commands from the Atlas Railway service environment so
   `prisma.config.ts` resolves the intended production connection.
4. Keep writes quiescent during the short migration window.
5. Confirm `DATABASE_URL` is the Atlas production database and that
   `DIRECT_URL`, when set, intentionally points to the same database.

### Commands

Run the configuration check first; it makes no database connection:

```bash
npm run config:check
```

Confirm Prisma sees the expected failed migration:

```bash
npm run db:migrate:status
```

Only after that status check names Context Engine as failed, record that failed
attempt as rolled back through Prisma:

```bash
npx prisma migrate resolve --rolled-back 20260825190000_context_engine
```

This command updates Prisma's migration ledger through the supported CLI. It
does not undo SQL, modify Atlas records, or mark the migration successful. It
allows Prisma to retry it.

Apply the pending migration history normally:

```bash
npm run db:migrate:deploy
```

Verify the final state:

```bash
npm run db:migrate:status
```

The final status should report that the database schema is up to date. A
normal Railway redeploy may then use the existing `start:migrate` command.

### Expected execution order

```text
migrate resolve --rolled-back Context Engine
  -> compatibility repair removes only an empty partial contexts column
  -> compatibility repair renames Task to TASK
  -> untouched Context Engine adds contexts again
  -> Context Engine backfills existing Task contexts
  -> Context Engine adds the nonblank constraint
  -> later pending migrations apply normally
```

## Why this is production-safe

- It uses Prisma's documented `migrate status`, `migrate resolve`, and
  `migrate deploy` production commands.
- It never edits `_prisma_migrations` directly.
- It does not modify or delete the failed historical migration.
- It does not reset or recreate the database.
- The compatibility migration preserves all Item rows and aborts on an
  unexpected or non-empty partial context state.
- The repair is transactional, minimizing lock duration and preventing a
  half-applied repair.
- Context values are backfilled by the original migration from the preserved
  `preferred_context` and `context` columns.
- Marking the failed migration as applied is explicitly avoided because its
  promised schema state was not reached.

## Rollback strategy

Do not run `prisma migrate reset`, a committed `down.sql`, or an inverse SQL
command in production.

If the compatibility migration fails, its explicit transaction rolls back its
own work. Stop deployment and inspect the reported guard. Only if Prisma lists
the compatibility migration itself as failed may it be resolved with:

```bash
npx prisma migrate resolve --rolled-back 20260825185000_item_type_task_compatibility_repair
```

Do not retry until the unexpected state is understood and a separately
reviewed forward migration exists if needed.

If the full recovery succeeds but a later release needs to reverse the stored
enum label, create a new forward migration and deploy the matching Prisma
mapping in the same release. Do not change an applied migration. The
pre-recovery snapshot remains the emergency restore point for an operational
rollback coordinated through the database provider.

## Risk assessment

| Risk | Level | Mitigation |
| --- | --- | --- |
| Running recovery against the wrong database | High | Run `config:check` and `migrate status` inside the intended Railway service before `resolve`. |
| Marking incomplete Context Engine as applied | High | Explicitly prohibited; use `--rolled-back`. |
| Losing partially populated context arrays | Low | The repair aborts if any existing `contexts` array is non-empty. |
| Enum/schema mismatch during deployment | Low | Deploy the Prisma `@map("TASK")` schema and migration together; keep writes quiescent until deployment completes. |
| DDL lock contention | Low | The repair transaction is short and contains no external work. Schedule the recovery during a quiet window. |
| Later migration failure | Medium | `migrate deploy` stops at the failure; inspect and resolve only the migration Prisma reports. Do not reset. |

## Validation

No application, Prisma schema, repository, or migration artifact changed in
this sprint. The recovery documentation was validated against the committed
migration tests and production build:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm test` | Passed; 135 tests. |
| `npm run build` | Passed; Prisma Client generation and the Next.js production build completed successfully. |

The production recovery commands were not executed from this checkout because
the production connection is intentionally unavailable. They must be run once,
from the Atlas Railway service environment, after the documented status check
and backup.

## References

- [Prisma production failed-migration workflow](https://docs.prisma.io/docs/orm/prisma-migrate/workflows/patching-and-hotfixing)
- [Prisma `migrate resolve` reference](https://docs.prisma.io/docs/cli/migrate/resolve)
- [Prisma `migrate status` reference](https://docs.prisma.io/docs/cli/migrate/status)
- [PostgreSQL enum behavior](https://www.postgresql.org/docs/current/datatype-enum.html)
- [PostgreSQL `ALTER TYPE`](https://www.postgresql.org/docs/current/sql-altertype.html)
