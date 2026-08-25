# Project workspace

The Project workspace makes outcome-oriented work visible without turning
Mission Control into a task manager. Projects remain first-class Items; all
progress and workload values are derived from their Tasks.

## Routes and questions

| Route | Question answered |
| --- | --- |
| `/projects` | Which Project needs attention or inspection? |
| `/projects/[projectId]` | What is true about this outcome and its work? |

Both route files remain Server Components. Interactive client roots call
application feature interfaces over the internal server transport.

Mission Control shows active Projects grouped by Area, links each title to its
workspace, and provides an `Open Projects` action. Non-active Projects are not
discarded; the overview status filter reveals them.

## Project overview

The default view includes every `Active` Project. Filters are combined with
AND semantics:

- Area, or all Areas;
- Project status, or all statuses;
- case-insensitive title, outcome, description, and Area search.

Sorting supports recent activity, title, Area, and progress. Filtering and
sorting are pure domain projections invoked by `ProjectService`; the UI does
not read or sort repository data itself.

Each Project card derives:

- progress: completed Tasks divided by non-archived Tasks;
- open count: every Task except Completed and Archived;
- completed, Waiting, and Blocked counts from exact statuses;
- scheduled work: open Tasks with a scheduled date, plus the nearest date;
- remaining duration: summed minutes where estimates exist;
- remaining effort: summed 1–5 effort values for open Tasks;
- last activity: the latest `updatedAt` across the Project and its Tasks.

Progress is zero for a Project with no Tasks. Missing duration estimates do not
become invented minutes; effort points remain visible as a separate fallback.
Archived Tasks do not affect progress or open-work totals.

## Project detail

The detail screen renders:

- outcome and optional description;
- Area, Project status, progress, effort, and last activity;
- recursive Task hierarchy;
- a chronological timeline of scheduled and due dates;
- Blocked, Waiting, Completed, and unscheduled Task projections.

Category sections intentionally repeat a Task that satisfies more than one
view. For example, a Blocked Task without a scheduled date appears in both
Blocked and Unscheduled. These are lenses over one Task, not duplicate data.

Timeline dates are date-only `YYYY-MM-DD` values. Scheduled and due events are
separate entries when a Task has both.

## Task commands

`ProjectService` owns all Task persistence commands:

- create;
- edit;
- delete;
- reorder sibling Tasks at any displayed hierarchy level;
- assign an Area;
- assign, change, or remove a Project association;
- update title, description, duration, energy, context, due date, scheduled
  date, and status.

Every Task requires a configured Area. Project association remains optional.
When a Project is selected, the service requires the Task and Project to share
an Area. Removing the association moves the Task to the top-level Item
collection; assigning one inserts it into the Project's children.

Edits preserve Task ID, creation time, attention score, tags, effort, generic
parent relationship when Project membership is unchanged, and any legacy child
hierarchy. Deletes remove the selected Task subtree. The UI asks for
confirmation before deletion.

New Tasks are root Tasks. Reordering applies within the selected Task's sibling
list at any displayed level. Reordering a legacy flat Project Task first
canonicalizes Project roots into ordered Project children. Nested legacy Tasks
remain visible and editable, but this sprint does not introduce subtask
creation.

Project child order is authoritative because `NextActionCalculator` uses it to
choose the next future action. Reordering therefore changes business order,
not merely presentation.

## Shared Task editor

Inbox triage and Project create/edit use the same `TaskEditor`, core fields,
planning fields, status list, parsing, and Area/Project filtering. Inbox wraps
the editor with `Today` status hidden; Project work exposes status. This avoids
two versions of Task dates, energy, duration, and assignment behavior.

Native form controls provide keyboard behavior and browser validation. Escape
returns from the editor, buttons remain reachable by Tab, and mutation results
use a polite live region.

## Manual breakdown boundary

`BreakdownService` is an application-layer interface. The current
`ManualBreakdownService` accepts rapid one-Task-per-line drafts and delegates a
single batch write to `ProjectService`. It preserves line order and creates
Active Tasks with neutral energy when no additional values are supplied.

An AI implementation can later implement the same service contract or augment
the drafts before persistence. The Project UI and repositories do not need to
know whether drafts came from manual entry or a model. No AI, prompt, network
call, or generated Task is included now.

## Data flow

```text
Project UI
  -> feature HTTP adapter
     -> ProjectService / BreakdownService
        -> pure ProjectWorkspace + TaskTree rules
        -> ItemRepository / AreaRepository
           -> PostgreSQL transaction
```

Reads calculate a render-ready overview or detail DTO. Commands use one
read-modify-write Item aggregate operation. The UI never imports repositories
or Prisma.

The PostgreSQL adapter writes one Item snapshot in a serializable transaction.
The aggregate contract remains a future concurrency limit if multiple writers
need record-level commands.

## Rendered states

The workspace has explicit loading, recoverable error, not-found, filter-empty,
no-Task, no-timeline, and empty-category states. Project status badges support
Active, Waiting, Blocked, Someday, Completed, and Archived. Production storage
contains no demo Projects; automated fixtures exercise each state in tests.
