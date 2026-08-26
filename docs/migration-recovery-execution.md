# Atlas production migration recovery execution

Execution date: 26 August 2026

## Result

**SUCCESS — production migration history is recovered and Atlas is online.**

Railway access and the production database connection were established
successfully. The deployment log reports Prisma `P3009` for
`20260825190000_context_engine`. A narrowly scoped, read-only inspection of
PostgreSQL confirmed that it was the **only unresolved failed migration**.
Prisma marked that failed attempt rolled back, applied the guarded compatibility
repair, retried Context Engine, and applied every later migration. Railway then
redeployed Atlas successfully and the public health request returned HTTP 200.

## Target environment

```text
Workspace:   maesei's Projects
Project:     clever-miracle
Environment: production
Service:     personal-os
Region:      ams
Database:    Postgres
```

| Property | Value |
| --- | --- |
| Node.js | `v25.8.1` |
| Prisma CLI | `7.9.1` |
| Prisma Client | `7.9.1` |
| Prisma provider | PostgreSQL |
| PostgreSQL server version | `18.6 (Debian 18.6-1.pgdg13+2)` |
| Application records preserved | Yes |
| Schema and migration ledger changed | Yes, through Prisma Migrate only |

## Access preparation

The Railway CLI confirmed the authenticated account and linked production
service. With explicit user approval, Railway registered this machine's public
SSH key. No private key was transmitted.

Railway emitted this warning:

```text
warning: Config as Code (railway.json / railway.toml) is deprecated. Prefer Infrastructure as Code (.railway/railway.ts).
Existing files keep working until 2026-12-01.
```

No configuration migration was performed because it is outside this recovery.

## Step 1 — configuration check

Command executed with the linked application-service variables:

```bash
railway run npm run config:check
```

Exit code: `0`

Relevant output:

```text
ATLAS DATABASE CONFIGURATION CHECK

DATABASE_URL: postgresql://[REDACTED]@postgres.railway.internal:5432/railway
DIRECT_URL: [NOT SET OR INVALID]
Prisma CLI source: DATABASE_URL

PASS DATABASE_URL — DATABASE_URL is valid and does not target a local host.
PASS DIRECT_URL — DIRECT_URL is not set; Prisma CLI will use DATABASE_URL.

Overall
PASS
```

The deployment is resolving Railway Postgres correctly. Localhost is not the
cause of this failure.

## Step 2 — Prisma status and reconciliation

Running the current checkout against production through a temporary Railway
Postgres tunnel produced this status summary:

```text
12 migrations found in prisma/migrations
Following migrations have not yet been applied:
20260825185000_item_type_task_compatibility_repair
20260825200000_effort_model
20260825210000_daily_workspace
20260825220000_focus_session
20260825230000_google_calendar
20260825233000_daily_wrap_up
```

The CLI summary did not print the unresolved Context Engine row. However, the
deployment's `migrate deploy` command returned `P3009`, and a read-only query of
Prisma's migration ledger confirmed:

```text
migration_name:       20260825190000_context_engine
started_at:           2026-08-25 18:15:19.322176 UTC
finished_at:          NULL
rolled_back_at:       NULL
applied_steps_count:  0
logs:                 contains the expected item_type enum error
checksum:             matches the committed migration file
```

There are no other unresolved failed migration rows. For the recovery decision,
the deployment `P3009` and the direct ledger inspection are authoritative; the
status command's omission is a reporting limitation in this state.

## Verified partial database state

The read-only inspection found:

| Check | Production result |
| --- | --- |
| `item_type` labels | `Task`, `Project`, `Workflow`, `Reference`, `Idea`, `Reminder`, `Review` |
| `TASK` enum label | Absent |
| `items.contexts` | Present, non-null, default empty array |
| Item rows | 4 |
| Rows with non-empty contexts | 0 |
| `items_contexts_nonblank_check` | Absent |

This identifies the failed statement and its effects:

1. The migration added `items.contexts`; that DDL persisted.
2. Its next statement compared `item_type` with the nonexistent enum literal
   `TASK`.
3. PostgreSQL rejected that comparison because the live enum label is `Task`.
4. The backfill and constraint were never completed.

The migration was not wrapped in a transaction, so its first statement remained
after the later statement failed even though Prisma records zero applied steps.

## Recovery compatibility

The already-committed migration
`20260825185000_item_type_task_compatibility_repair` was applied immediately
before Context Engine and safely handled this exact partial state:

- it refuses to proceed if any existing context array is non-empty;
- production had zero non-empty context arrays at the execution guard;
- it removed the empty partial column so Context Engine could recreate it;
- it transactionally renamed the enum label from `Task` to `TASK`;
- Context Engine was then retried unchanged, preserving migration history.

The repair does not delete item rows or change application behavior.

## Step 3 — resolve failed migration

Status: **SUCCESS**.

Command executed against the linked production database:

```bash
npx prisma migrate resolve --rolled-back 20260825190000_context_engine
```

Exit code: `0`

```text
Migration 20260825190000_context_engine marked as rolled back.
```

This changed only Prisma's migration ledger. It did not undo SQL or edit
application records.

## Step 4 — deploy migrations

Status: **SUCCESS**.

Command executed:

```bash
npm run db:migrate:deploy
```

Exit code: `0`

Applied order:

1. `20260825185000_item_type_task_compatibility_repair`
2. retry `20260825190000_context_engine`
3. the five later pending migrations

Prisma concluded:

```text
All migrations have been successfully applied.
```

## Step 5 — final migration status

Command executed:

```bash
npm run db:migrate:status
```

Exit code: `0`

```text
12 migrations found in prisma/migrations
Database schema is up to date!
```

## Step 6 — Atlas Doctor

Command executed against production through the temporary tunnel:

```bash
npm run doctor
```

Doctor connected in 96 ms and reported:

```text
35 passed
7 warnings
0 errors
ATLAS READY WITH WARNINGS
```

The warnings are environmental artifacts of the verification path:

- the encrypted tunnel intentionally rewrote the host to `127.0.0.1:15432`;
- the local verification shell did not set Railway's `NODE_ENV`, `PORT`, or
  `HOSTNAME`;
- `DIRECT_URL` is intentionally absent, so Prisma uses `DATABASE_URL`.

Doctor independently confirmed schema validity, current migrations, successful
`SELECT 1`, database counts, deployment scripts, and the complete server
dependency boundary.

## Step 7 — regression validation

Commands executed locally:

```bash
npm test
npm run build
```

Results:

- tests: `135` passed, `0` failed;
- build: successful Next.js 16.3.2 production build;
- Prisma Client generation: successful;
- standalone deployment preparation: successful.

## Step 8 — production redeployment

Command executed for the latest production image:

```bash
railway redeploy -s personal-os -y
```

Deployment ID:

```text
f77cde25-8495-453c-bd77-3b73342c0801
```

The startup container reported:

```text
Startup configuration is safe.
No pending migrations to apply.
Next.js 16.3.2
Network: http://0.0.0.0:8080
Ready in 0ms
```

Railway reports `personal-os` and Postgres online. A public HTTPS request to
the Atlas root returned `200`.

## Risk assessment

Risk is low but non-zero:

- the repair aborts rather than discards user-owned context data;
- the observed production guard condition passed immediately before execution;
- the enum rename preserves existing enum-backed item values;
- the failed migration checksum matches the committed file;
- no historical migration is edited or deleted;
- the workflow uses Prisma's supported `migrate resolve --rolled-back` path.

Had a context array become non-empty before execution, the repair would have
stopped with an explicit exception before dropping the column.

## Remaining warnings

1. The Doctor run emitted a `pg` deprecation warning about overlapping
   `client.query()` calls; it did not affect the successful checks.
2. npm reports that the legacy `production` configuration should use
   `--omit=dev`; startup remains successful.
3. Prisma reports an optional major update from 7.9.1 to an 8.0 release
   candidate; no dependency upgrade was attempted during recovery.
4. Railway's current Config as Code format is deprecated effective
   1 December 2026; it remains functional and was not changed here.

## Change audit

- Production reads: migration metadata, enum labels, column metadata,
  constraint metadata, aggregate context counts, and Doctor counts.
- Production writes: Prisma migration resolution and the committed migrations
  only.
- Schema changes: seven committed migrations applied successfully.
- Historical migration files changed: none.
- Application code changes: none.
