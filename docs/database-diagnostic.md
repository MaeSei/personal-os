# Atlas database configuration diagnostic

> Historical baseline: this report records the configuration before Atlas
> Sprint 6.0.1. The remediation replaces localhost examples, adds a shared
> database configuration validator, and runs a pre-migration Railway startup
> gate. See `docs/deployment.md` for the current deployment procedure.

Diagnostic date: 25 August 2026

Scope: repository-owned source and configuration in the current checkout.

Changes made: this report only. No application code, configuration, database,
or deployment was modified.

Secrets and passwords are redacted throughout this report. Dependency folders,
generated output, build output, and `.git` were excluded from the repository
search because they are not repository-owned source. The search was performed
before this report existed, so this file does not create self-matches.

## Executive conclusion

Atlas has two database URL consumers:

1. Prisma CLI commands, including `prisma migrate deploy`, use `DIRECT_URL` when
   it exists and otherwise use `DATABASE_URL`.
2. The running Next.js application uses only `DATABASE_URL`.

There is no active environment file in this checkout and none of the relevant
variables is set in the diagnostic shell. In this exact environment, Prisma
selects no URL. A non-mutating `npx prisma migrate status` preflight confirmed
that Prisma stops with:

```text
Error: The datasource.url property is required in your Prisma config file when using prisma migrate status.
```

It does **not** attempt localhost when the URL is absent. Consequently, if
`prisma migrate deploy` in Railway attempts `localhost:5432`, the Railway
process had either:

- `DIRECT_URL` set to a localhost URL; or
- no `DIRECT_URL`, but `DATABASE_URL` set to a localhost URL.

Because `DIRECT_URL` takes precedence for migrations, a stale `DIRECT_URL` can
make migrations use localhost even when Railway's `DATABASE_URL` reference is
correct. The literal value of Railway service variables is external deployment
state and is not present in this repository, so this audit cannot distinguish
those two cases without a redacted Railway Variables snapshot.

## Environment files

### `.env`

```text
[NOT PRESENT]
```

### `.env.local`

```text
[NOT PRESENT]
```

### `.env.production`

```text
[NOT PRESENT]
```

No other active `.env*` file exists at the repository root. Only
`.env.example` is present.

### `.env.example`

```dotenv
# PostgreSQL connection used by the running Atlas server. Railway's PostgreSQL
# service can provide this through a DATABASE_URL reference variable.
DATABASE_URL="postgresql://[REDACTED]@localhost:5432/atlas"

# Optional direct connection used only by Prisma CLI migrations when the
# runtime DATABASE_URL points at a transaction pooler. Railway's standard
# PostgreSQL URL is already direct, so this can normally remain unset.
# DIRECT_URL="postgresql://[REDACTED]@localhost:5432/atlas"

# Railway injects PORT at runtime. The standalone Next.js server reads it
# automatically, so do not add PORT here.
# The production start script binds HOSTNAME=0.0.0.0 explicitly so Railway's
# health checker can reach the service. Do not add HOSTNAME here either.
#
# Add future server-only variables without a NEXT_PUBLIC_ prefix. Variables
# prefixed with NEXT_PUBLIC_ are included in the browser bundle at build time
# and must never contain secrets.
```

The localhost values are examples. Neither dotenv, Next.js, Prisma, nor
Railway loads `.env.example` automatically. It becomes active locally only if
someone copies it to an active env file or manually copies its value into a
process/deployment variable.

The repository `.gitignore` ignores `.env*` and explicitly allows only
`.env.example`. Therefore a developer or Railway variable may exist outside
Git without being visible in this checkout; none exists in the current local
filesystem or shell.

## Prisma datasource

The complete datasource block in `prisma/schema.prisma` is:

```prisma
datasource db {
  provider = "postgresql"
}
```

There is no `url = env("DATABASE_URL")` expression in the schema. With this
Prisma 7 setup, the CLI connection URL is supplied by `prisma.config.ts`.

## Prisma configuration

The complete `prisma.config.ts` is:

```ts
import "dotenv/config";

import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  datasource: databaseUrl ? { url: databaseUrl } : undefined,
  migrations: {
    path: "prisma/migrations",
  },
  schema: "prisma/schema.prisma",
});
```

This is the only repository code that chooses the Prisma CLI URL.

## Resolution paths and precedence

### `npx prisma migrate deploy`

Resolution occurs in this order:

```text
existing command process environment
        ↓
dotenv/config reads .env and fills only missing variables
        ↓
process.env.DIRECT_URL ?? process.env.DATABASE_URL
        ↓
Prisma config datasource.url
        ↓
prisma migrate deploy
```

The installed `dotenv` behavior is important:

- `import "dotenv/config"` reads `.env` in the current working directory by
  default;
- it does not automatically read `.env.local` or `.env.production`;
- without `override: true`, an existing shell/process variable wins over the
  value in `.env`.

Atlas then applies its own precedence: a defined `DIRECT_URL` wins over
`DATABASE_URL`. The nullish-coalescing operator considers an empty string a
defined value; however, the following conditional converts an empty result to
an undefined datasource, which causes Prisma Migrate to reject the config.

For the current checkout and diagnostic shell:

```text
DIRECT_URL   = [NOT SET]
DATABASE_URL = [NOT SET]
.env         = [NOT PRESENT]
selected URL = [NONE]
```

Therefore `npx prisma migrate deploy` in this exact environment has no URL and
will fail its datasource requirement rather than connect to localhost. The
deploy command itself was not executed because it is a mutating command; the
read-only `migrate status` command confirmed the same configuration preflight.

### Next.js development

In development, Next.js loads environment variables in this effective order:

1. values already present in `process.env`;
2. `.env.development.local`;
3. `.env.local`;
4. `.env.development`;
5. `.env`.

Earlier sources win; later files only fill values that are still missing. None
of these files exists in this checkout. The `.env.production` file would not be
part of the development order, and `.env.example` is never loaded.

At runtime, `src/lib/prisma.ts` reads exactly:

```ts
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to access Atlas persistence.");
}
```

It does not read `DIRECT_URL`, `DB_HOST`, or `PGHOST`. It passes the required
connection string to `PrismaPg`, and no URL is embedded in `next.config.ts`.
Thus the current development shell selects no Next.js database URL; an Atlas
repository access will throw the explicit missing-`DATABASE_URL` error. It will
not fall back to node-postgres's default localhost because the guard runs
before the adapter is created.

### Railway deployment

`railway.json` runs:

```text
build: npm run build
start: npm run start:migrate
```

The start sequence is:

```text
Railway service variables
        ↓
npm run db:migrate:deploy
        ↓ succeeds only
npm start
        ↓
standalone Next.js server
```

For the migration phase, the URL is the Railway process's `DIRECT_URL` when
present, otherwise its `DATABASE_URL`. For the application phase, the URL is
only the Railway process's `DATABASE_URL`.

Railway injects service variables into the command process; `railway.json`
does not contain their values. No Railway CLI, local Railway project metadata,
committed env file, Docker build argument, or alternate deployment file exists
in this checkout. Therefore the literal Railway URL and host cannot be printed
from repository evidence. They must be inspected in the Atlas service's
Railway Variables panel.

This also means a migration failure prevents the Next.js server from starting,
which subsequently presents as a failed Railway health check even though the
health check is not the original fault.

## Current value matrix

| Source | Value | Used by | Notes |
| --- | --- | --- | --- |
| Current shell: `DIRECT_URL` | Not set | Prisma CLI | Highest-priority Atlas migration variable. |
| Current shell: `DATABASE_URL` | Not set | Prisma CLI and Next.js server | Prisma fallback; sole application runtime URL. |
| Current shell: `DB_HOST` | Not set | Nothing in Atlas | No repository reference. |
| Current shell: `PGHOST` | Not set | Nothing directly in Atlas | No repository reference; explicit URL handling makes it irrelevant here. |
| Current shell: `PGPORT` | Not set | Nothing directly in Atlas | No repository reference. |
| `.env` | File absent | Prisma CLI and Next.js when present | Prisma dotenv loads this file; Next.js loads it last. |
| `.env.local` | File absent | Next.js when present | Development override; Prisma config does not load it. |
| `.env.production` | File absent | Next.js production when present | Not used by Prisma config's dotenv import. |
| `.env.example` | Redacted localhost template | Nothing automatically | Documentation/template only. |
| `prisma.config.ts` | `DIRECT_URL ?? DATABASE_URL`; currently undefined | Prisma CLI | Contains precedence logic, not a hardcoded URL. |
| `src/lib/prisma.ts` | `process.env.DATABASE_URL`; currently undefined | Next.js server | Explicitly throws if missing. |
| `package.json` scripts | No URL assignments | npm/Prisma/Next.js | Commands inherit their process environment. |
| Railway service variables | Literal value not observable from checkout | Railway migration and server processes | The deployment's actual source of truth. |

## Package scripts

Every Prisma-related script from `package.json` is:

```json
{
  "build": "prisma generate && next build --webpack",
  "db:generate": "prisma generate",
  "db:migrate:deploy": "prisma migrate deploy",
  "db:migrate:dev": "prisma migrate dev",
  "db:migrate:status": "prisma migrate status",
  "db:validate": "prisma validate",
  "postinstall": "prisma generate",
  "start:migrate": "npm run db:migrate:deploy && npm start"
}
```

None defines, rewrites, or defaults a database variable. The scripts inherit
the environment of the shell, IDE, or Railway process that starts them.

## Railway and container configuration

### `railway.json`

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "RAILPACK",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run start:migrate",
    "healthcheckPath": "/",
    "healthcheckTimeout": 120
  }
}
```

### Other requested deployment files

```text
nixpacks.toml       [NOT PRESENT]
Dockerfile          [NOT PRESENT]
docker-compose.yml  [NOT PRESENT]
docker-compose.yaml [NOT PRESENT]
```

There is no file-based environment injection in these paths. Railpack builds
the repository and Railway provides service variables to the build/runtime
process environment. The npm commands simply inherit them.

## Complete repository occurrence report

The following is the complete match set for the requested exact search terms
in repository-owned files. A path and line are listed once when the same line
contains more than one requested term.

### `DATABASE_URL`

```text
.env.example:2
.env.example:3
.env.example:6
docs/deployment.md:22
docs/deployment.md:33
docs/deployment.md:34
docs/deployment.md:42
docs/deployment.md:67
docs/deployment.md:68
docs/deployment.md:123
prisma.config.ts:5
src/lib/prisma.ts:12
src/lib/prisma.ts:15
```

### `DB_HOST`

```text
[NO OCCURRENCES]
```

### `PGHOST`

```text
[NO OCCURRENCES]
```

### `localhost`

```text
.env.example:3   DATABASE_URL="postgresql://[REDACTED]@localhost:5432/atlas"
.env.example:8   # DIRECT_URL="postgresql://[REDACTED]@localhost:5432/atlas"
README.md:17     http://localhost:3000 (twice: link label and target)
```

The README occurrence is the Next.js web server address, not PostgreSQL.

### `127.0.0.1`

```text
[NO OCCURRENCES]
```

### `5432`

```text
.env.example:3
.env.example:8
```

### `railway.internal`

```text
[NO OCCURRENCES]
```

### `PrismaClient`

```text
src/lib/prisma.ts:5
src/lib/prisma.ts:8
src/lib/prisma.ts:11
src/lib/prisma.ts:25
src/lib/prisma.ts:29
src/lib/prisma.ts:30
src/lib/prisma.ts:39
src/repositories/PrismaAreaRepository.ts:2
src/repositories/PrismaAreaRepository.ts:5
src/repositories/PrismaDailyReviewRepository.ts:7
src/repositories/PrismaDailyReviewRepository.ts:11
src/repositories/PrismaDayPlanRepository.ts:7
src/repositories/PrismaDayPlanRepository.ts:10
src/repositories/PrismaItemRepository.ts:14
src/repositories/PrismaItemRepository.ts:18
src/repositories/PrismaRepositoryFactory.ts:3
src/repositories/PrismaRepositoryFactory.ts:17
src/repositories/PrismaRepositoryFactory.ts:18
src/repositories/PrismaRepositoryFactory.ts:19
src/repositories/PrismaRepositoryFactory.ts:20
```

The factory matches are calls to `getPrismaClient`; the requested substring is
part of that identifier.

### Literal `env(`

```text
src/styles/tokens.css:100  env(safe-area-inset-top)
src/styles/tokens.css:101  env(safe-area-inset-right)
src/styles/tokens.css:102  env(safe-area-inset-bottom)
```

These are browser CSS safe-area functions and have no relationship to process
environment variables or Prisma. There is no Prisma schema `env(...)`
occurrence.

### Supplemental `DIRECT_URL` search

`DIRECT_URL` was not one of the requested search strings but is required to
explain the actual precedence:

```text
.env.example:8
docs/deployment.md:34
docs/deployment.md:41
docs/deployment.md:69
docs/deployment.md:70
prisma.config.ts:5
```

## Localhost source determination

| Candidate | Is it the current source? | Evidence |
| --- | --- | --- |
| `.env` | No in this checkout | File is absent. If created later from the example, it could become a source. |
| `.env.local` | No in this checkout | File is absent and Prisma CLI would not load it through the current config anyway. |
| `prisma.config.ts` | No hardcoded localhost | It selects process variables; it does not contain a host. |
| Railway Variables | Most likely for a Railway migration attempt | They are the only deployment-time URL source not represented in repository files. `DIRECT_URL` can override `DATABASE_URL`. |
| Hardcoded application code | No | Runtime code reads `process.env.DATABASE_URL` and explicitly rejects absence. |
| `package.json` scripts | No | No database variable is assigned by any script. |
| Shell/process environment | Proven category of source | Railway Variables become process environment. A local shell value would also override `.env`. The current diagnostic shell has none. |
| `.env.example` | Not directly | It is inert, but its localhost placeholder can be manually copied into an active env or Railway variable. |

For a reported **Prisma migration** connection to localhost, `PGHOST` and
`DB_HOST` are not candidates under the current configuration: there are no
repository references, and missing `datasource.url` produces a configuration
error rather than a node-postgres fallback.

## Detected issues

1. The actual Railway Variables state is not versioned or inspectable from the
   checkout. This prevents the repository alone from identifying whether
   `DIRECT_URL` or `DATABASE_URL` contains localhost.
2. Migration and application connection selection intentionally differ.
   `DIRECT_URL` affects Prisma CLI only, making a stale value easy to overlook
   when the application `DATABASE_URL` appears correct.
3. The executable localhost template in `.env.example` can be copied into an
   active file or deployment variable without replacing the placeholder.
4. A migration URL error blocks `npm start`, so Railway reports a health-check
   failure downstream of the real database configuration error.

## Potential issues

- `.env.local` may appear to work in `next dev` but is invisible to the Prisma
  CLI configuration. A developer can therefore make the application and
  migration commands resolve different values locally.
- `.env.production` is part of Next.js production loading when present, but
  the current `dotenv/config` import does not load it for Prisma CLI commands.
- A Railway variable copied as a literal URL can remain stale after a database
  service is replaced. A reference variable tracks the PostgreSQL service and
  avoids that drift.
- Build-time success does not validate the production connection. `prisma
  generate` requires the schema but does not prove that the runtime database
  URL is correct or reachable.

## Most likely root cause and confidence

**Most likely root cause:** the Railway Atlas service process contains a
localhost connection URL in `DIRECT_URL` or `DATABASE_URL`, probably copied
from `.env.example`. If the Railway `DATABASE_URL` reference has already been
verified as correct, then a stale `DIRECT_URL` is the leading explanation
because it silently takes precedence for `prisma migrate deploy`.

Confidence:

- **Very high (99%)** that localhost is not selected by the current repository
  code when both URL variables are absent; the installed CLI preflight confirms
  it errors instead.
- **High (95%)** that a Railway migration attempting localhost received it
  through Railway's process environment.
- **Undetermined between `DIRECT_URL` and `DATABASE_URL`** without the Railway
  Variables state. If `DATABASE_URL` is known to be correct, confidence that
  `DIRECT_URL` is the culprit is high.

## How Railway should be configured (description only)

No configuration was changed. For a PostgreSQL service named `Postgres`, the
Atlas application service should have a Railway reference variable equivalent
to:

```text
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

Use Railway's reference-variable picker rather than typing or copying the URL.
For Railway's standard direct PostgreSQL connection, `DIRECT_URL` should be
unset. If a transaction pooler is intentionally introduced, `DATABASE_URL`
should reference the pooler and `DIRECT_URL` should reference the database's
direct connection URL. Neither variable should point to `localhost`,
`127.0.0.1`, or the application's own container.

The expected private database hostname is supplied by Railway and may end in
`.railway.internal`; it should not be manually constructed. The application
and PostgreSQL services must be in the appropriate Railway project/environment
for that private reference to resolve.

After variables are injected, the existing deployment behavior is:

- migration: `DIRECT_URL` if set, otherwise `DATABASE_URL`;
- application: `DATABASE_URL` only;
- port: Railway-provided `PORT`;
- bind address: `HOSTNAME=0.0.0.0` from the npm start script.

This section documents the intended state only; it does not assert that the
current Railway service already has these values.
