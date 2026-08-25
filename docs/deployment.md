# Atlas deployment

Atlas deploys as a standalone Next.js server on Railway and uses PostgreSQL for
all product data. Database migrations run before the server starts.

## Development

Requirements:

- Node.js 20.19 or newer;
- PostgreSQL 14 or newer;
- a database user allowed to create tables, indexes, enums, constraints, and
  migration metadata.

```bash
npm ci
cp .env.example .env
npm run db:migrate:dev
npm run dev
```

Replace every uppercase placeholder in the copied file before running Prisma.
Set `DATABASE_URL` in `.env` to the local database. `prisma migrate dev` applies
committed migrations and creates a development migration when the schema
changes. Do not use it against production.

`npm run config:check` is deliberately stricter than local development: it is a
deployment-readiness check and reports local database hosts as errors. Local
development may still use a locally running PostgreSQL instance with
`prisma migrate dev`; production startup may not.

No seed command exists. A fresh database is intentionally empty and Atlas
opens onboarding because it finds no Areas.

## Environment variables

| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Runtime and Prisma CLI | PostgreSQL connection used by the application and normal Railway migrations. |
| `DIRECT_URL` | No | Prisma CLI | Direct connection for migrations when `DATABASE_URL` uses a transaction pooler. Railway's standard PostgreSQL URL is already direct. |
| `GOOGLE_CALENDAR_CLIENT_ID` | For Calendar | Server runtime | Google Cloud Web application OAuth client ID. |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | For Calendar | Server runtime | Confidential OAuth client secret; never expose with `NEXT_PUBLIC_`. |
| `GOOGLE_CALENDAR_REDIRECT_URI` | For Calendar | Server runtime | Exact registered callback, normally `https://YOUR_DOMAIN/api/calendar/google/callback`. |
| `CALENDAR_TOKEN_ENCRYPTION_KEY` | For Calendar | Server runtime | Base64-encoded 32-byte key for AES-256-GCM refresh-token encryption. |
| `PORT` | Railway-managed | Runtime | Port read by the standalone Next.js server. |
| `HOSTNAME` | Script-managed | Runtime | Fixed to `0.0.0.0` so Railway health checks can reach the process. |

Database URLs and future secrets must never use a `NEXT_PUBLIC_` prefix. Only
safe public values may enter the browser bundle.

Prisma CLI configuration prefers `DIRECT_URL` when present. The running
application always uses `DATABASE_URL` through the PostgreSQL driver adapter.

### DATABASE_URL and DIRECT_URL

`DATABASE_URL` is mandatory. It is the only connection used by the running
Next.js application and is also Prisma CLI's fallback connection.

`DIRECT_URL` is optional and is used only by Prisma CLI commands:

```text
DIRECT_URL, when defined
        ↓ otherwise
DATABASE_URL
```

Do not define `DIRECT_URL` for Railway's standard PostgreSQL connection. Define
it only when `DATABASE_URL` intentionally uses a transaction pooler and Prisma
migrations need a separate direct connection. An empty `DIRECT_URL` is not the
same as an absent variable: it shadows `DATABASE_URL` in the current Prisma
configuration and prevents migrations from resolving a URL.

Both values are secrets. Never commit them, print credentials in logs, or use a
`NEXT_PUBLIC_` prefix.

## Production build

```bash
npm ci
npm run db:validate
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run build` generates Prisma Client and creates Next.js standalone output.
It also compiles the read-only database configuration checker so production
startup can validate Railway variables without requiring the development-only
TypeScript compiler. The post-build script copies static assets required by the
standalone server. Prisma CLI remains a production dependency because the
release start command runs committed migrations after Railway has pruned
development packages.

Do not run `prisma migrate dev` in production. Deploy committed migration files
with `npm run db:migrate:deploy`.

## Railway workflow

1. Create or open the Railway project for Atlas.
2. Add a PostgreSQL service in the same project.
3. In the Atlas service Variables panel, add `DATABASE_URL` as a reference to
   the PostgreSQL service's `DATABASE_URL` variable. For a service named
   `Postgres`, Railway displays the reference as
   `${{Postgres.DATABASE_URL}}`.
4. Leave `DIRECT_URL` unset for a standard Railway PostgreSQL connection. If a
   pooler is introduced later, point `DIRECT_URL` at the direct database URL.
5. To enable Google Calendar, configure the Google Cloud OAuth client and add
   the four server-only Calendar variables described below.
6. Connect the GitHub repository and deploy the intended branch.
7. Railpack installs the lockfile and runs `npm run build` from `railway.json`.
8. Railway starts `npm run start:migrate`. This validates the injected URLs,
   runs `prisma migrate deploy`, and starts Next.js—in that order. Invalid or
   unsafe configuration aborts before Prisma can emit a misleading connection
   error.
9. The `/` health check must pass before Railway promotes the deployment.
10. Generate a Railway domain and smoke-test onboarding, capture, Inbox triage,
   Daily Review, Mission Control, Focus Mode, and Project workspaces.

## Google Calendar OAuth on Railway

1. In Google Cloud, enable the Google Calendar API.
2. Configure the OAuth consent screen and add the Atlas Google account as a
   test user while the app remains in testing.
3. Create an OAuth client with application type **Web application**.
4. Add the production callback exactly as an authorized redirect URI:

   ```text
   https://YOUR_ATLAS_DOMAIN/api/calendar/google/callback
   ```

5. On the Atlas Railway service, add `GOOGLE_CALENDAR_CLIENT_ID`,
   `GOOGLE_CALENDAR_CLIENT_SECRET`, and the same URI as
   `GOOGLE_CALENDAR_REDIRECT_URI`.
6. Generate the encryption key locally with a cryptographically secure tool,
   for example `openssl rand -base64 32`, and store the result only as
   `CALENDAR_TOKEN_ENCRYPTION_KEY` on the Atlas service.
7. Redeploy, open Planner, choose **Sign in with Google**, select calendars,
   and verify **Refresh now** updates the sync timestamp.

All four variables are required together. Atlas treats a partial configuration
as unavailable and does not attempt OAuth. The client secret, encryption key,
authorization code, access token, and refresh token are never returned by the
browser feature API. Do not rotate `CALENDAR_TOKEN_ENCRYPTION_KEY` while a
connection exists: disconnect first or provide an explicit credential
re-encryption migration, otherwise the stored refresh token cannot be read.

Google Calendar access is read-only. Disconnect revokes the grant when Google
is reachable and always deletes Atlas's local encrypted credential and cache.

The migration-before-start choice prevents new code from serving against an
older schema. Its tradeoff is that a broken migration blocks deployment rather
than leaving the old release online with partially compatible code.

## Railway reference variables

Configure variables on the **Atlas application service**, not only on the
PostgreSQL service.

For a PostgreSQL service named `Postgres`, the normal configuration is:

```text
Atlas service variable
DATABASE_URL = ${{Postgres.DATABASE_URL}}

DIRECT_URL = [not defined]
```

Use Railway's variable reference picker. Do not manually copy the resolved URL
and do not construct a `.railway.internal` hostname. References follow Railway
credential and service changes; copied literal URLs can become stale.

If a transaction pooler is intentionally introduced:

```text
DATABASE_URL = reference to the pooler connection
DIRECT_URL   = reference to the direct PostgreSQL connection
```

In that configuration, `DIRECT_URL` may legitimately have a different host.
`npm run config:check` reports this as a warning so the migration target is
explicit. Production startup permits an intentional non-local difference but
blocks local or placeholder targets.

## Startup validation

The production sequence is:

```text
Railway injects service variables
        ↓
read-only database configuration check
        ↓ passes
prisma migrate deploy
        ↓ succeeds
standalone Next.js server
        ↓
Railway health check /
```

The checker parses URLs without connecting to PostgreSQL and never exposes
credentials. It blocks startup when `DATABASE_URL` is missing, malformed, a
placeholder, or points to a local host. It also blocks a local `DIRECT_URL`
because that value would override `DATABASE_URL` during migration.

Run the same check manually with:

```bash
npm run config:check
```

It prints redacted targets, Prisma precedence, `PASS`, `WARNING`, and `ERROR`
findings. It does not connect, migrate, or modify Railway variables.

## Common configuration mistakes

| Mistake | Result | Correction |
| --- | --- | --- |
| `DATABASE_URL` is absent on the Atlas service | Runtime and migrations have no database target. | Add a Railway reference to `${{Postgres.DATABASE_URL}}`. |
| `DATABASE_URL` points to `localhost` or `127.0.0.1` | The Atlas container tries to connect to itself. | Replace it with the PostgreSQL service reference. |
| `.env.example` placeholders were copied unchanged | The hostname or credentials are fake. | Select the Railway reference; do not copy the example. |
| `DIRECT_URL` is an empty string | It shadows `DATABASE_URL` for Prisma CLI. | Delete the variable entirely. |
| A stale local `DIRECT_URL` remains set | Migrations target localhost even if `DATABASE_URL` is correct. | Delete `DIRECT_URL` or replace it with the intentional direct Railway URL. |
| A resolved URL was pasted instead of referenced | Credentials or hosts can become stale after service changes. | Use Railway's reference-variable picker. |
| Variables exist only on the PostgreSQL service | The Atlas process does not receive them. | Define the reference on the Atlas application service. |
| Google OAuth redirect differs by one character | Google returns `redirect_uri_mismatch`. | Copy the exact HTTPS callback into Google Cloud and `GOOGLE_CALENDAR_REDIRECT_URI`. |
| Only some Calendar variables are set | Planner reports Calendar as not configured. | Define all four server-only Calendar values and redeploy. |
| Encryption key is changed after connection | Atlas cannot decrypt the stored refresh token. | Restore the original key or disconnect/reconnect with a deliberate credential migration. |
| Calendar secret uses `NEXT_PUBLIC_` | The browser bundle can expose a credential. | Remove the public prefix and rotate the leaked secret immediately. |

## Railway troubleshooting

When deployment stops before migrations:

1. Read the `ATLAS CONFIGURATION ERROR` block in the deployment log. Values are
   redacted, but the selected field, host, precedence, and recommended action
   are shown.
2. Open the Atlas service's Variables panel for the same Railway environment as
   the deployment.
3. Verify `DATABASE_URL` is a reference to the PostgreSQL service, normally
   `${{Postgres.DATABASE_URL}}` when that service is named `Postgres`.
4. Inspect `DIRECT_URL` separately. Delete it for standard Railway PostgreSQL;
   otherwise confirm it is a non-local direct connection.
5. Redeploy so the corrected variables are injected into a new process.
6. If configuration passes but migrations fail, use `npm run doctor` or
   `npm run db:migrate:status` in the Railway environment to distinguish DNS,
   authentication, connectivity, and migration-history failures.

Do not add `localhost`, `127.0.0.1`, or a literal value from `.env.example` as
a workaround. In Railway, those hosts cannot refer to the separate PostgreSQL
service.

## Prisma troubleshooting

The startup checker validates syntax and target safety before Prisma runs. If
Prisma still fails afterward:

- confirm the log says which source won: `DIRECT_URL` or `DATABASE_URL`;
- run `npm run db:migrate:status` in the same Railway environment;
- treat `P1001` as a network/host reachability problem after configuration has
  passed;
- treat authentication failures as credential/reference problems;
- inspect pending or failed migrations without running `migrate dev` in
  production.

`prisma validate` validates the schema, not database reachability.

## Migration workflow

For every schema change:

1. Change `prisma/schema.prisma` locally.
2. Run `npm run db:migrate:dev -- --name concise_change_name` against a disposable
   development database.
3. Inspect the generated SQL, including indexes, constraints, and destructive
   statements.
4. Add a documented recovery/forward-fix procedure for nontrivial migrations.
5. Run the complete validation suite.
6. Back up production, then deploy. `prisma migrate deploy` applies only pending
   committed migrations.
7. Verify `npm run db:migrate:status` against the target environment.

The initial migration is in
`prisma/migrations/20260824000000_initial_postgresql/migration.sql`.

## Rollback and recovery

Prisma Migrate does not use routine automatic down migrations in production.
The safe response depends on migration state:

- If application code is faulty but the schema is backward-compatible, roll
  back the Railway application deployment and leave the successful migration
  applied.
- If a migration failed, correct the database state, then use `prisma migrate
  resolve --rolled-back <migration-name>` or `--applied` as appropriate before
  redeploying.
- If a successful schema change must be reversed, create and deploy a new
  forward corrective migration. Restore from the verified backup when data was
  destructively transformed.

The initial migration includes `down.sql` solely to verify reversal on an
empty disposable database. It drops every Atlas table and all data. Never run
it as routine production rollback.

Recommended disposable verification:

1. Create an empty temporary PostgreSQL database.
2. Point `DATABASE_URL` at it and run `npm run db:migrate:deploy`.
3. Verify `npm run db:migrate:status` reports no pending migration.
4. Execute the initial `down.sql` only against that temporary database.
5. Verify the Atlas tables and enum types are absent.
6. Re-run `npm run db:migrate:deploy` to prove clean re-application.

## Persistence and security

Data now follows the PostgreSQL service across application restarts and devices.
Atlas currently has no authentication or user ownership model, so the deployed
URL must be treated as private. Do not expose a public multi-user instance until
authorization and per-user data isolation are implemented.

Former browser LocalStorage data is not imported automatically. A future import
must be explicit and authenticated; blindly accepting browser data into the
single server dataset would be unsafe.

## References

- [Prisma production migrations](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)
- [Prisma rollback and down-migration workflow](https://docs.prisma.io/docs/orm/prisma-migrate/workflows/generating-down-migrations)
- [Prisma Next.js guide](https://www.prisma.io/docs/guides/frameworks/nextjs)
- [Railway Next.js deployment guide](https://docs.railway.com/guides/nextjs)
