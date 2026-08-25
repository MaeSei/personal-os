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

Set `DATABASE_URL` in `.env` to the local database. `prisma migrate dev`
applies committed migrations and creates a development migration when the
schema changes. Do not use it against production.

No seed command exists. A fresh database is intentionally empty and Atlas
opens onboarding because it finds no Areas.

## Environment variables

| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Runtime and Prisma CLI | PostgreSQL connection used by the application and normal Railway migrations. |
| `DIRECT_URL` | No | Prisma CLI | Direct connection for migrations when `DATABASE_URL` uses a transaction pooler. Railway's standard PostgreSQL URL is already direct. |
| `PORT` | Railway-managed | Runtime | Port read by the standalone Next.js server. |
| `HOSTNAME` | Script-managed | Runtime | Fixed to `0.0.0.0` so Railway health checks can reach the process. |

Database URLs and future secrets must never use a `NEXT_PUBLIC_` prefix. Only
safe public values may enter the browser bundle.

Prisma CLI configuration prefers `DIRECT_URL` when present. The running
application always uses `DATABASE_URL` through the PostgreSQL driver adapter.

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
The post-build script copies static assets required by the standalone server.
Prisma CLI remains a production dependency because the release start command
runs committed migrations after Railway has pruned development packages.

Do not run `prisma migrate dev` in production. Deploy committed migration files
with `npm run db:migrate:deploy`.

## Railway workflow

1. Create or open the Railway project for Atlas.
2. Add a PostgreSQL service in the same project.
3. In the Atlas service Variables panel, add `DATABASE_URL` as a reference to
   the PostgreSQL service's `DATABASE_URL` variable.
4. Leave `DIRECT_URL` unset for a standard Railway PostgreSQL connection. If a
   pooler is introduced later, point `DIRECT_URL` at the direct database URL.
5. Connect the GitHub repository and deploy the intended branch.
6. Railpack installs the lockfile and runs `npm run build` from `railway.json`.
7. Railway starts `npm run start:migrate`. This runs `prisma migrate deploy`
   first; the Next.js server starts only after migrations succeed.
8. The `/` health check must pass before Railway promotes the deployment.
9. Generate a Railway domain and smoke-test onboarding, capture, Inbox triage,
   Daily Review, Mission Control, Focus Mode, and Project workspaces.

The migration-before-start choice prevents new code from serving against an
older schema. Its tradeoff is that a broken migration blocks deployment rather
than leaving the old release online with partially compatible code.

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
