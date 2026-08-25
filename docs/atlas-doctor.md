# Atlas Doctor

Atlas Doctor is a read-only developer diagnostic for the complete Atlas
environment. It checks configuration, database reachability, Prisma state,
deployment scripts, and architecture boundaries without applying migrations or
changing application data.

## Running the Doctor

Human-readable output:

```bash
npm run doctor
```

Structured JSON:

```bash
npm run doctor:json
```

When another tool must parse stdout as JSON without npm's script banner, use:

```bash
npm run --silent doctor:json
```

The scripts compile the TypeScript diagnostic into the ignored
`.doctor-dist/` directory before execution. This keeps Atlas compatible with
the project's Node.js 20 minimum without adding a TypeScript runtime dependency.

Atlas Doctor loads the root `.env` file with dotenv's normal non-overriding
behavior. Existing shell or Railway process variables win. It intentionally
does not load `.env.local` or `.env.production`, matching the current Prisma
CLI configuration in `prisma.config.ts`.

## Safety guarantees

Atlas Doctor is read-only:

- it never runs `prisma migrate deploy`, `prisma migrate dev`, or SQL writes;
- Prisma validation reads local schema/configuration files;
- migration status uses `prisma migrate status` only;
- connectivity uses `SELECT 1`;
- database statistics use `SELECT COUNT(*)` and metadata queries;
- architecture and deployment checks read files only;
- credentials, passwords, tokens, and secret query parameters are redacted in
  human and JSON output;
- database record contents are never selected or displayed.

## Exit codes

| Code | Meaning | Overall value |
| --- | --- | --- |
| `0` | Every check passed. | `ATLAS READY` |
| `1` | One or more non-blocking warnings exist. | `ATLAS READY WITH WARNINGS` |
| `2` | One or more errors prevent Atlas from running safely. | `ATLAS NOT READY` |

Warnings deliberately produce exit code `1`, including a missing optional
`DIRECT_URL`, because the command is intended to make every environmental
difference visible to developers and CI.

## Checks

Checks always run and render in the following order.

### 1. Environment

The Doctor checks `DATABASE_URL`, `DIRECT_URL`, `NODE_ENV`, `PORT`, and
`HOSTNAME` for four states:

- present;
- missing;
- present but empty;
- present but suspicious or malformed.

`DATABASE_URL` is required and its absence is an error. An empty `DIRECT_URL`
is also an error: `DIRECT_URL ?? DATABASE_URL` selects the empty string, so it
shadows a valid `DATABASE_URL` and leaves Prisma without a datasource URL.

Database URLs are displayed only in redacted form. `NODE_ENV` is checked
against `development`, `production`, and `test`; `PORT` must be an integer from
1 to 65535.

### 2. Database URL

The Doctor parses `DATABASE_URL` and reports:

| Field | Behavior |
| --- | --- |
| Provider | Accepts `postgresql` and `postgres`. Other providers are errors. |
| Host | Reports the resolved hostname without credentials. |
| Port | Uses the explicit port or PostgreSQL's default `5432`. |
| Database | Reads the URL path and errors when it is empty. |
| Schema | Reads `?schema=` or reports `public`. |
| SSL | Reports enabled, disabled, or not specified from `ssl`/`sslmode`. |

`localhost`, `127.0.0.1`, `::1`, and `0.0.0.0` produce warnings because they
refer to the current machine or container. Literal placeholder hosts such as
`host` and `hostname` are errors. Explicitly disabling SSL for a non-local host
produces a warning.

### 3. DIRECT_URL

The Doctor explains the current Prisma precedence:

```text
DIRECT_URL, when defined
        ↓ otherwise
DATABASE_URL
```

`DIRECT_URL` affects Prisma CLI commands, including migration status and
deployment. The running Atlas server still uses `DATABASE_URL` only.

The check warns when:

- `DIRECT_URL` is missing;
- it points at a local host;
- its host, port, database, or schema differs from `DATABASE_URL`.

A different target may be intentional when `DATABASE_URL` uses a transaction
pooler, but it should always be reviewed because it changes where migrations
run.

### 4. Prisma

The Doctor verifies:

- `prisma/schema.prisma` exists;
- `prisma.config.ts` exists;
- generated Prisma Client output exists;
- at least one migration directory contains `migration.sql`;
- `prisma validate` succeeds;
- `prisma migrate status` reports the current database state.

Migration status is skipped when there is no effective URL. Pending migrations
are warnings. Configuration, connectivity, or migration-history errors are
blocking errors. No migration is applied.

### 5. Repository

Static source checks verify the existence and shape of:

- `ApplicationContainer`;
- the `RepositoryFactory` contract;
- `PrismaRepositoryFactory`;
- server-only guards on the production composition root, Prisma factory, and
  Prisma client module.

The reported repository chain is:

```text
ApplicationContainer
  → RepositoryFactory
  → PrismaRepositoryFactory
  → Prisma Client
```

### 6. Connectivity

When `DATABASE_URL` is valid, Atlas Doctor opens a bounded PostgreSQL connection
and executes only:

```sql
SELECT 1 AS result;
```

It reports round-trip latency and whether the required Atlas tables are
visible. Connection and statement timeouts are five seconds. Common PostgreSQL,
DNS, authentication, timeout, and connection-refused errors are translated into
short root-cause messages without printing credentials.

Connectivity intentionally uses `DATABASE_URL`, not `DIRECT_URL`, because it
tests the same connection used by the running Atlas server.

### 7. Database

After successful connectivity, read-only counts report:

- Areas from `areas`;
- Projects from Project rows in `items`;
- Tasks from Task rows in `items`;
- Inbox Items from Inbox-status rows in `items`;
- Daily Reviews from `daily_reviews`;
- Users when a `users` table exists.

The current Atlas schema has no Users table, so `Users — Not implemented` is a
successful informational result. Required missing tables are errors. Only
counts are returned; no titles, descriptions, notes, or other record contents
are queried.

### 8. Deployment

The Doctor parses `railway.json` and `package.json`, then verifies:

- Railway starts `npm run start:migrate`;
- `start:migrate` validates configuration, deploys migrations, and then runs
  `npm start`;
- `db:migrate:deploy` uses `prisma migrate deploy`;
- Railway invokes `npm run build`;
- the build generates Prisma Client, compiles the startup checker, and builds
  Next.js.

These checks report drift only. They never rewrite either file.

### 9. Architecture

The source scan verifies the intended dependency graph:

```text
UI
  → Application Services
  → Repositories
  → Prisma
  → PostgreSQL
```

Specifically, it checks that:

- no Client Component imports Prisma, generated Prisma code, the Prisma client
  module, or repository modules;
- concrete Prisma repositories are instantiated only by
  `PrismaRepositoryFactory`;
- the Atlas API route delegates through the application container;
- the production composition root selects `PrismaRepositoryFactory`.

Any bypass is a blocking architecture error.

### 10. Summary

Human output totals passed checks, warnings, and errors, lists the warning/error
messages, prints the overall state, and prints the exit code. JSON output places
the same result in a stable versioned structure:

```json
{
  "generatedAt": "2026-08-25T10:00:00.000Z",
  "sections": [
    {
      "checks": [
        {
          "id": "environment.database_url",
          "label": "DATABASE_URL",
          "message": "Present.",
          "status": "ok"
        }
      ],
      "id": "environment",
      "title": "Environment"
    }
  ],
  "summary": {
    "errors": 0,
    "exitCode": 0,
    "ok": 1,
    "overall": "ATLAS READY",
    "warnings": 0
  },
  "title": "ATLAS DOCTOR REPORT",
  "version": 1
}
```

The JSON contract is designed for later CI consumption. Check IDs are stable;
human messages may become more explanatory over time.

## Typical failures

| Finding | Meaning | What to inspect |
| --- | --- | --- |
| `DATABASE_URL — Missing` | Atlas cannot create its server database client. | The active shell, root `.env`, or Railway Atlas service Variables panel. |
| `DIRECT_URL — Empty` | Empty `DIRECT_URL` shadows `DATABASE_URL` for Prisma. | Remove the empty definition or supply an intentional direct URL. |
| `Host localhost` | The process is targeting itself. This is normal only for a locally running PostgreSQL server. | The redacted target and environment that launched the command. |
| `Host host` | A placeholder was copied without replacement. | The active URL source. |
| `DNS could not resolve` | The host is unavailable from the current network/environment. | Railway service/environment relationship and private networking. |
| `Connection refused` | A host resolved, but PostgreSQL is not listening or reachable on that port. | Host, port, service health, and network exposure. |
| `PostgreSQL rejected credentials` | The server was reached but authentication failed. | Refresh the Railway reference or local database credentials. Never paste them into logs. |
| `Pending migrations detected` | The database is reachable but committed migrations are not current. | Deployment workflow and the intended target database. |
| `Generated client is missing` | Install/build generation has not run. | `npm run db:generate`. |
| `Required table ... is missing` | The target database is empty, wrong, or not migrated. | URL target and migration status. |
| `Client Component boundary` error | Browser code imports persistence directly. | The listed source files and feature-interface boundary. |

## Railway troubleshooting

1. Run `npm run --silent doctor:json` in a Railway shell or equivalent process
   environment. Running locally cannot reveal Railway-only variables.
2. In the Atlas service Variables panel, verify `DATABASE_URL` is a reference
   to the PostgreSQL service variable rather than a copied localhost example.
3. Inspect `DIRECT_URL` as well. It takes precedence for Prisma migration
   commands even when `DATABASE_URL` is correct.
4. For Railway's standard direct PostgreSQL service, leave `DIRECT_URL` unset.
   Introduce it only when `DATABASE_URL` intentionally points to a transaction
   pooler.
5. Keep the application and PostgreSQL services in the Railway environment
   where the private reference resolves. Do not manually construct a
   `.railway.internal` hostname.
6. Remember that `start:migrate` runs before `npm start`. A migration connection
   error therefore becomes a downstream health-check failure because the web
   server never starts.

Atlas Doctor reports configuration; it never changes Railway Variables or
triggers a deployment.

## Prisma troubleshooting

Use the checks to separate four failure classes:

1. **Local artifact failure:** schema, config, generated client, or migrations
   are missing.
2. **URL resolution failure:** `DIRECT_URL ?? DATABASE_URL` is absent, empty, or
   malformed.
3. **Connectivity failure:** the selected host cannot be resolved, reached, or
   authenticated.
4. **Migration-state failure:** PostgreSQL is reachable, but committed
   migrations are pending or the migration history is inconsistent.

`prisma validate` does not prove database reachability. `prisma migrate status`
uses the Prisma CLI target, which may be `DIRECT_URL`; the Doctor's `SELECT 1`
uses the application target, `DATABASE_URL`. Seeing one pass and the other fail
usually means those URLs point at different targets.

## Example human output

```text
ATLAS DOCTOR REPORT

Environment
✓ DATABASE_URL — Present.
⚠ DIRECT_URL — Missing.

Database URL
✓ Provider — postgresql
✓ Host — atlas-db.railway.internal
✓ Port — 5432
✓ Database — railway
✓ Schema — public
✓ SSL — not specified

Prisma
✓ Schema — prisma/schema.prisma exists.
✓ Schema validation — Schema is valid.
✓ Migration status — Migrations are current.

Connectivity
✓ Read-only connection — Connected (23 ms). SELECT 1 succeeded.

Architecture
✓ Dependency graph — UI → Application Services → Repositories → Prisma → PostgreSQL

Overall
ATLAS READY WITH WARNINGS
Exit code: 1
```
