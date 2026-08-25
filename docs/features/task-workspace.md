# Atlas Task Workspace

**Sprint:** 7.2
**Date:** 2026-08-25
**Status:** Implemented

## Purpose

The Task Workspace at `/tasks/[taskId]` is the canonical place to understand
and change one concrete action. It keeps the Project outcome visible when one
exists, but it also treats standalone Tasks as complete work objects.

The screen answers one question: **what is this action, and what should change
about it?** It does not become a planner, Project dashboard, or activity feed.

## Component hierarchy

```text
app/tasks/[taskId]/page.tsx          Server Component route
└── TaskDetailClient                Feature calls, loading, routing
    └── TaskDetail                  Calm page composition
        ├── PageHeader
        ├── TaskOverview            Description and canonical facts
        ├── TaskActions
        │   ├── TaskEditor          Shared Project/Task editor
        │   ├── TaskMoveForm
        │   └── TaskConvertForm
        ├── TaskContextSections     Dependencies and notes
        ├── TaskHistory
        └── TaskFuture              Named extension points only
```

Workspace, Project, and Planner Task titles link to this canonical route.
These surfaces still own their original decisions; the link only adds a
consistent zoom-in path.

## Data flow

```text
Task UI
  -> TaskFeature
  -> HttpFeatures
  -> POST /api/atlas
  -> TaskService
  -> ItemRepository + AreaRepository
  -> Prisma repositories
  -> PostgreSQL
```

React never imports the application service or repositories. `TaskService`
loads Area and Project context, validates assignments, and owns Task lifecycle
commands. `ProjectService` delegates its existing Task commands to the same
service, preserving Project Workspace behavior while preventing two command
implementations from drifting.

## Information model

The overview displays every currently supported Task fact:

- title and description;
- optional Project and its outcome;
- required Area;
- estimated duration, effort, energy, and confidence;
- preferred context;
- status;
- optional due date;
- date-only or exact scheduled allocation.

Exact start/end scheduling remains owned by Planner Time Blocks. Task edit can
change the date-only intention, while the Planner changes an accepted time
allocation. This keeps estimation, intention, and reservation distinct.

## Command semantics

| Command | Decision |
| --- | --- |
| Edit | Reuses the shared `TaskEditor`; identity, creation time, exact Time Block projection, tags, and attention are preserved. Current duration, effort, energy, and confidence are editable metadata. |
| Move | Requires an Area and permits a Project in that same Area. Selecting no Project creates a standalone Task. |
| Detach | Clears Project membership while retaining the Task's Area and all Task metadata. |
| Duplicate | Creates a shallow, active copy with a new identity. Schedule is cleared so Atlas does not silently reserve the same time twice. |
| Delete | Removes the Task and nested work only after an explicit confirmation. |
| Convert to Project | Requires a desired outcome, removes the Task identity, creates one new first-class Project, and rehomes nested work under it. |

Conversion uses a new Project identity rather than changing the existing row
type in place. Day Plans and Time Blocks can therefore never keep a Task link
that now points at a Project. The old Task is removed before the replacement is
inserted, preventing duplicate Items. Nested Tasks retain their identity and
are assigned to the new Project.

## History and intentionally empty concepts

The persisted Item model currently stores `createdAt` and `updatedAt`, but not
an event log or `completedAt`. History therefore shows:

- the exact creation timestamp;
- the latest update timestamp, including when it initially matches creation;
- for completed Tasks, `updatedAt` as the explicitly labelled best available
  completion time.

Open Tasks show **Not completed** instead of a fabricated timestamp.

Dependencies and dedicated Task notes have no current domain or database
representation. Their sections render truthful empty states. Atlas does not
reinterpret hierarchy as dependency data or description as a note. The DTO
already names these collections so a future persistence model can populate
them without restructuring the screen.

AI suggestions and Review history are documented extension points only. No
button implies a capability that does not exist. Future AI must return a
proposal through a dedicated application boundary and require approval before
calling a Task command. Future review links should use persisted evidence, not
infer history from edit timestamps.

## Accessibility and responsive behavior

- Route files remain Server Components; only transport and form interactions
  are client-side.
- Native buttons, links, form controls, labels, and confirmation controls
  provide keyboard access and visible shared focus rings.
- Loading, not-found, errors, and successful commands use existing status and
  live-region patterns.
- Facts move from one to two to three columns while actions wrap naturally,
  keeping the same semantic order on mobile and desktop.
- Status and warnings use text in addition to color.

## Persistence and migration

This sprint adds no schema field, migration, seed, or placeholder record. It
uses the existing Item tree, Area rows, and repository snapshot contracts.
Dependencies, notes, and exact completion history need explicit future domain
decisions and database migrations before they can store data.
