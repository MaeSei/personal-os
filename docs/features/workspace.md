# Atlas Daily Workspace

**Updated:** 2026-08-25
**Status:** Sprint 7.8 polished

## Purpose

Workspace is Atlas's primary screen at `/`. The center is an intentional desk,
not a query for Tasks whose status or date happens to match today. Projects stay
visible on the left and Inbox processing stays visible on the right, while the
user explicitly decides what enters the Daily Workspace.

```text
Projects by Area | Daily Workspace | Inbox
                 | Current focus   |
                 | Pinned          |
                 | Named groups    |
                 | Available Tasks |
```

## Source of truth

The date-scoped `DayPlan` is the only source of daily membership and ordering.
`Status.Today`, due dates, and schedules may describe a Task, but none of them
automatically commits it to the Workspace. A fresh date therefore starts empty.

Each ordered Day Plan commitment stores:

| Field | Meaning |
| --- | --- |
| `taskId` | Reference to the global Task |
| `position` | One durable order across the day |
| `pinned` | Daily prominence only |
| `group` | Optional user-authored daily group, max 60 characters |
| `focused` | The one Task explicitly chosen as current focus |
| `session` | Daily elapsed time, running segment, notes, and lightweight checklist |

These values do not belong on `Task`. Pinning or grouping work today must not
permanently relabel it or carry that decision into tomorrow.

## Commands

`WorkspaceFeature` exposes explicit commands implemented by `WorkspaceService`:

- place an available Task or move an existing commitment;
- pin and unpin;
- set or clear a group;
- select focus;
- remove from today without deleting the Task;
- archive the Task globally.

Selecting **Focus** marks that commitment as the sole current focus and moves a
draft Day Plan to `Started`, then the UI opens Focus Session. `FocusService` reads
the same plan and projects the focused Task first. Removing a scheduled Task
also unlinks it from today's Time Blocks and clears its schedule projection.

## Data flow

```text
Workspace UI
  -> WorkspaceFeature
  -> POST /api/atlas
  -> WorkspaceService
     -> pure Daily Workspace domain operations
     -> DayPlanRepository + ItemRepository + AreaRepository
  -> Prisma repositories
  -> PostgreSQL
```

The browser never imports repositories, Prisma, or application services. The
service validates that new commitments are available Tasks and that Projects
are active. The Day Plan repository writes order and all daily metadata in one
transaction.

## Interaction model

- Desktop pointer users can drag Tasks from the available pool into Pinned,
  Ungrouped, or an existing named group and drag before another Task.
- Touch and keyboard users have equivalent Add, Pin/Unpin, Group, Up, Down,
  Remove, Focus, and Archive controls.
- `Alt+ArrowUp` and `Alt+ArrowDown` reorder a focused Task card.
- Boundary checks make those shortcuts no-ops at the first and last positions;
  the visible Move up/Move down buttons use the same presentation rule.
- Group editing uses progressive disclosure and suggests existing group names;
  it focuses the field when opened and closes with Escape.
- Filters use progressive disclosure, report the active-filter count, and
  narrow committed and available Task views without hiding the Project horizon.
- Mutation results are announced through a polite live region and controls are
  temporarily disabled during a write. The affected Task exposes a Saving state.
- Successful Inbox processing returns keyboard focus to the updated processing
  region instead of dropping focus when the previous Item leaves the page.

Native HTML drag events intentionally avoid a new dependency. They do not offer
a complete touch-drag experience across mobile browsers, which is why every
drag operation has a labeled button/form alternative.

## Responsive hierarchy

Mobile order is Daily Workspace, Projects, Inbox. An empty day uses one clear
drop destination rather than empty Pinned and Ungrouped regions. Tablet places
the Daily Workspace across the first row and gives Projects and Inbox balanced
columns. Wide desktop uses Projects left, Daily Workspace center, and Inbox
right. Task triage fields respond to their container width, so the narrow Inbox
rail remains one column even on a wide screen. All content remains in the
document; no rail becomes hidden navigation.

## Feedback and empty states

- The daily column shows a real loading status before data exists; it never
  presents a false empty day while the request is pending.
- Retry feedback distinguishes initial unavailability from refreshable stale
  data and does not claim a cross-repository write was unchanged.
- Filtered empty states say whether daily Tasks or available Tasks have no
  matches. The unfiltered state encourages intentional selection without fake
  Tasks or automatic planning.
- Project and Inbox loading remain independent, so one rail can communicate its
  state without blocking the rest of the desk.

## Future AI boundary

Future AI may propose Tasks, groups, or order, but it must return a proposal.
Only an explicit user action may call the existing Workspace commands. AI must
not silently create commitments, pin work, select focus, or archive Tasks.

## Current tradeoffs

- Group identity is intentionally lightweight and exists only while at least
  one commitment uses the group title.
- Archiving spans Item and Day Plan repositories, which do not yet share a unit
  of work. Item state is written first; stale commitment references are already
  excluded from reads if the second write needs retrying.
- Daily order is global. Pinned and group views preserve relative order, while
  moving a Task between groups places it at the chosen target position.
- Native pointer drag remains an enhancement rather than the only interaction.
  Touch and keyboard users use the explicit Add, Move, Pin, Group, and Remove
  controls.
