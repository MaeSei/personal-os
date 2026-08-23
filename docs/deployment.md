# Atlas deployment

Atlas is deployed as a standalone Next.js Node.js service on Railway. The
application is publicly reachable, while all user data remains in each
browser's local storage. There is no database, API, authentication layer, or
server-side persistence in this release.

## Development

### Requirements

- Node.js 20.9 or newer
- npm and the committed `package-lock.json`

Install the locked dependency versions and start the development server:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. No environment variables are currently required.
`.env.example` records that contract and is the template for future settings.
If variables are introduced later, copy it to `.env.local` and add only local
values there:

```bash
cp .env.example .env.local
```

Do not commit `.env.local` or any other populated environment file.

## Production

Build and run the same artifact locally before deployment:

```bash
npm ci
npm run build
npm start
```

`next.config.ts` enables `output: "standalone"`. Next.js then traces the
runtime dependencies and creates a minimal server in `.next/standalone`.
`postbuild` runs `scripts/prepare-standalone.mjs`, which copies `public` and
`.next/static` into that folder because Next.js deliberately leaves those
assets out of standalone output. `npm start` launches the generated server
rather than a second build or a custom server.

The build script explicitly uses Next.js's supported Webpack builder. Next.js
16 defaults to Turbopack, whose CSS build workers require local socket binding;
Webpack keeps production builds compatible with restricted CI and container
builders. The tradeoff is a potentially slower build, with no difference to the
generated standalone runtime. This choice can be revisited when the target
build environment supports Turbopack's worker model consistently.

For a local production smoke test, open `http://localhost:3000` after
`npm start`. A platform may select another port by setting `PORT`; the generated
server reads it automatically.

## Environment variables

Atlas has no required application variables in this release.

| Variable | Owner | Required | Purpose |
| --- | --- | --- | --- |
| `PORT` | Railway | Yes in Railway | Injected automatically and read by the standalone server. Do not set it in `.env.example`. |
| `HOSTNAME` | Runtime | No | The standalone server defaults to `0.0.0.0`; override only for a specific self-hosting environment. |
| `NODE_ENV` | Build/runtime | No manual setup | Next.js and Railway use production mode for the deployed build. |

Future secrets must use server-only names and be configured in Railway's
Variables panel. Never prefix secrets with `NEXT_PUBLIC_`: Next.js inlines
those values into the browser bundle at build time. Add every new variable to
`.env.example` with a non-secret placeholder and document whether it is needed
at build time, runtime, or both.

No `DATABASE_URL` is defined because this sprint intentionally has no database.

## Railway configuration

`railway.json` keeps build and runtime settings versioned with the application:

- Railpack detects the Node.js project and installs locked npm dependencies.
- `npm run build` creates and packages the standalone artifact.
- `npm start` runs `.next/standalone/server.js` and honors Railway's `PORT`.
- The `/` health check prevents an unresponsive deployment from becoming the
  active version.
- A 120-second health-check window allows a cold Node.js service to start
  without hiding genuine startup failures for too long.

The repository also declares Next.js's minimum supported Node.js version in
`package.json`, so local and hosted builds have the same runtime floor.

## Deployment workflow

1. Run `npm ci`, `npm run lint`, and `npm run build` locally.
2. Push the verified commit to the GitHub branch connected to Railway.
3. In Railway, create a project with **Deploy from GitHub repo** and select this
   repository. Railpack reads `railway.json`; no Dockerfile is required.
4. Confirm the build log completes and the health check for `/` passes.
5. In the service's **Settings → Networking** area, generate a Railway domain.
6. Open the generated URL and smoke-test Mission Control, Daily Review, Inbox,
   and Focus Mode at mobile and desktop widths.
7. Later pushes to the connected branch create new deployments using the same
   versioned configuration.

The Railway CLI is an optional alternative after `railway login` and
`railway init`; `railway up` uploads the current workspace. Git-based deployment
is preferred for production because the deployed revision is explicit and
repeatable.

## Local persistence boundary

The deployed application is available from any device, but data does not sync
between devices. `LocalStorageRepository` stores items and Daily Review results
under the current browser profile and domain. Clearing site data, changing
browsers, or opening Atlas on another device creates a separate local data set.
Railway restarts and redeployments do not erase that browser data because it is
never stored in the Railway container.

This is intentional for the no-backend release. A future persistent repository
can implement the existing repository interfaces without changing the UI, but
that migration is outside this deployment sprint.

## References

- [Railway's Next.js deployment guide](https://docs.railway.com/guides/nextjs)
- [Railway configuration as code](https://docs.railway.com/config-as-code/reference)
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables)
