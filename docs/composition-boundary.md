# Server composition boundary

Atlas keeps production persistence entirely behind a server boundary.

```text
Client Component
  -> AtlasFeatures interface
  -> HTTP feature adapter
  -> Next.js route handler
  -> server-only ApplicationContainer
  -> application service
  -> repository contract
  -> Prisma repository
  -> PostgreSQL
```

`ApplicationContainerProvider` supplies browser-side feature adapters, not
application service instances. `src/app/api/atlas/route.ts` is the transport
boundary and delegates every allowed operation to
`applicationContainer.features`. It contains no persistence queries.

`src/application/container.ts` selects `PrismaRepositoryFactory`.
`ServiceContainer` receives the resulting repository contracts and constructs
services. `ApplicationContainer` exposes only `AtlasFeatures`, so neither
repositories nor concrete service classes leak into UI.

This boundary exists because Prisma Client and its PostgreSQL pool are
server-only objects that cannot be serialized into React context. It also
creates a clear future path to Server Actions or Server Component queries.

The enforced rules are:

- `src/features` and `src/components` do not import repositories or concrete
application services;
- only the Prisma factory instantiates production repositories;
- only the server composition root selects persistence;
- client code calls stable feature interfaces;
- repository access always passes through an application service.

The Daily Planner follows the same boundary: Planner Client Components depend
only on `PlannerFeature`; `PlannerService` is the sole owner of Day Plan
repository calls and planning rules. Mission Control and Focus services may read
the Day Plan repository to compose their own use cases, but UI never sees that
dependency.

`tests/composition-boundary.test.ts` verifies the import boundary, exposed
container shape, repository construction site, and PostgreSQL runtime selection.
