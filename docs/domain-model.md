# Atlas domain model

This document records the domain decisions implemented by the Task, Project,
Inbox-processing, and PostgreSQL persistence refactors. These rules are
independent of the active persistence adapter.

## Core model

Atlas keeps `Item` as the compatibility envelope for everything that can be
stored. Project and Task are first-class refinements with stronger invariants.

| Concept | Required Area | Optional Project | Can appear in focus | Purpose |
| --- | --- | --- | --- | --- |
| Task | Yes | Yes | Yes, when `Today` | Concrete work Atlas can advance. |
| Project | Yes | No | No | Outcome-oriented container for Tasks. |
| Inbox Idea | No | No | No | Untriaged thought awaiting a decision. |
| Other Item types | Existing rules | No explicit Project membership | No | Compatibility for Workflow, Reference, Reminder, Review, and Idea data. |

## Task decisions

`Task` is an `Item` refinement defined in `src/domain/Task.ts`.

A valid Task always has:

- `type: Task`
- a non-empty `areaId`
- `projectId`, which is either a Project ID or `null`

Tasks may also carry planning metadata:

- `estimatedDuration`, a positive whole-number estimate;
- `preferredContext`, a short place or tool preference;
- `preferredTime`, one of Anytime, Morning, Afternoon, or Evening;
- `scheduledStart` and `scheduledEnd`, an optional paired primary allocation;
- `dueDate`, a deadline calendar day;
- `scheduledDate`, an intended-work calendar day.

`durationMinutes` and `context` remain compatibility fields during migration.
New UI and application flows use the canonical estimate and preference names.
Preferred values are advisory and never create a schedule automatically.

Exact Task scheduling is owned by a linked Time Block. `scheduledStart` and
`scheduledEnd` are a synchronized projection of the earliest linked block in
today's Day Plan so Project and Task views can answer when the next allocation
starts without loading the full Planner aggregate. Removing all of today's
links clears that projection without changing Task status.

Due and legacy scheduled dates use the date-only `YYYY-MM-DD` form. They are deliberately not JavaScript
timestamps because a calendar day must not move when a device changes time
zone. Exact scheduled boundaries are real instants projected from the Day
Plan's date, local minutes, and time zone. Estimated duration does not overwrite
the existing 1–5 `effort` scale, and preferences do not change attention
scoring or schedule work automatically.

`createTask` is the canonical constructor. It validates identity and Area,
normalizes strings, initializes timestamps, and creates a leaf Item. New Task
creation must use this function rather than assembling an Item literal.

`isTask` is the runtime boundary. Focus planning and Project action selection
accept only Items that pass this refinement.

### Area ownership

The Task's `areaId` is explicit and authoritative. A Project-linked Task is
created with its Project's Area, but the model keeps the Task Area as its own
field. Existing non-empty Task Areas are never overwritten by migration, even
if they differ from the Project Area.

This decision supports standalone Tasks and preserves existing data. Inbox
triage prevents a Task from being assigned to a Project in a different Area.
The compatibility migration still does not silently rewrite an existing,
non-empty Task Area.

### Optional Project membership

`projectId` expresses Project membership directly:

- `null` means the Task is standalone.
- a Project ID means the Task belongs to that Project.

`parentId` remains the generic Item hierarchy field for backward compatibility.
For newly created Project Tasks, both `projectId` and `parentId` contain the
Project ID. Domain logic treats `projectId` as the explicit relationship and
uses `parentId` or recursive containment only as compatibility fallbacks.

Keeping both fields avoids an unsafe one-step rewrite of existing recursive
Item data. A future database schema should make `projectId` the canonical
foreign key and decide separately whether generic Item hierarchy is still
needed.

### Task children

`createTask` creates Tasks with no children. The Task refinement does not yet
reject legacy children because doing so could make stored work disappear.
Legacy hierarchy is preserved during migration; new code should treat Tasks as
leaf work.

## Project decisions

Project remains a first-class `Item` refinement with:

- a required Area;
- a required outcome;
- Project-specific status and energy fields;
- zero or more Task actions.

Projects are containers and never appear directly in Today or Focus Mode.
`createProject` accepts an optional first next action. When supplied, it creates
that action through `createTask`, assigns the Project Area, and sets both Task
relationship fields. When omitted, it creates a valid Project with no Tasks.
This allows Inbox processing to capture an outcome without inventing work.

Project outcome and description are separate concepts. Inbox triage persists
an absent optional description as `null`. Existing callers that omit the
constructor field entirely retain the legacy behavior of copying the outcome
into `description`, preserving previously established onboarding behavior.

Project status controls whether its Tasks can be projected as next actions. An
inactive Project contributes no focus candidate.

Project workspace values such as progress, status counts, scheduled work,
remaining effort, and last activity are derived from current Tasks by
`ProjectWorkspace.ts`. They are not persisted on Project and therefore cannot
become stale denormalized fields. Task-tree commands preserve Project child
order because that order controls next-action selection.

## Actionability and focus planning

Only a valid Task with `status: Today` is actionable.

This deliberately excludes Projects and non-Task Items even if older data gives
them a Today status. The Attention Engine therefore ranks concrete work only.

Blocked work follows the same boundary: Mission Control and Focus Mode show
blocked Tasks, not blocked Projects or arbitrary Items.

`NextActionCalculator` applies these rules:

1. Consider only active Projects.
2. Consider only valid Task actions.
3. Prefer an explicitly Today Task.
4. Otherwise project the first Active or Someday Task into Today in memory.
5. Return at most one Task per Project.
6. Include standalone Today Tasks whose `projectId` is `null`.

Project child order remains meaningful for choosing the first future action.
The projection does not mutate persistence.

The FocusPlan scoring, attention-budget limits, energy fit, and switching-cost
weights are unchanged. Project switching now uses explicit `projectId` before
falling back to legacy hierarchy.

### Planning suggestions

`PlanningRulesEngine` is separate from focus planning. Focus decides what Atlas
may surface for execution; Planning Suggestions help the user construct a Day
Plan. The rules engine accepts only explicit inputs, excludes non-available
statuses, selects at most one available action per active Project, and ranks
context/time fit without writing state. See `docs/planning-rules-engine.md`.

## Inbox capture and processing

Inbox capture remains an `Idea` with `status: Inbox`, not a Task. It may have no
Area because it has not been clarified into work. Capturing a thought therefore
does not violate the Task Area invariant and does not make the thought eligible
for focus.

Inbox processing preserves the captured Item ID and `createdAt` timestamp. It
replaces that Item in the aggregate instead of creating a second Item, and sets
`updatedAt` to the processing time. This makes each decision mutually
exclusive and prevents conversion duplicates.

Every Inbox Item has exactly five supported exits:

| Decision | Result |
| --- | --- |
| Task | `Task + Today`; Area required, Project optional. |
| Project | `Project + Active`; Area and outcome required, zero Tasks allowed. |
| Someday | Original Item type with `status: Someday`. |
| Reference | `Reference + Active`; no Area is invented. |
| Delete | Item is removed from the aggregate. |

Task triage requires a configured Area. When a Project is selected, the
application service verifies that it exists and has the same Area. Omitted
energy retains the captured Idea's neutral energy value. Optional Project
membership sets both `projectId` and compatibility `parentId` through
`createTask`.

Project triage keeps outcome-first semantics. It creates no implicit Task. A
separate follow-up command can add one first Task using the Project Area, or
the user can explicitly defer that decision.

Someday remains an Idea because deferral decides timing, not meaning. Reference
uses the already-supported `ItemType.Reference` and `Status.Active`; Atlas does
not require an Area for non-actionable reference material. Delete is the only
exit that does not preserve the captured data.

## Backward-compatible migration

`migrateLegacyTasks` in `src/domain/TaskMigration.ts` remains a pure
compatibility helper for legacy Item snapshots. It does not change timestamps.

For each legacy Task, migration resolves Project membership in this order:

1. A valid explicit `projectId`.
2. A `parentId` that references a Project.
3. The Project that recursively contains the Task.
4. No Project (`null`).

It resolves a missing Area in this order:

1. Preserve an existing non-empty `areaId`.
2. Inherit the resolved Project's Area.
3. Use the canonical Personal Area ID (`personal`).

If Project membership is inferred and `parentId` is absent, migration also
fills `parentId` with the Project ID. Existing unrelated hierarchy is retained.

In-memory compatibility repositories still use the helper in tests. The active
PostgreSQL repository expects data written through current domain constructors;
legacy browser snapshots are not imported automatically.

### Why Personal is the final fallback

A stored Task with neither Area nor resolvable Project cannot satisfy the new
invariant without a deterministic choice. `personal` is an existing canonical
Atlas Area ID and makes the Task usable rather than dropping or reclassifying
it. The migration does not automatically add Personal to the user's selected
Area list; referential cleanup can be handled during the future database import
where validation and user confirmation are available.

## Repository and service responsibilities

Repositories retain only aggregate persistence operations:

- `ItemRepository.get/save`
- `AreaRepository.get/save`
- `DailyReviewRepository.get/getHistory/save`

They serialize and migrate data but do not decide what counts as a Task,
Project, Inbox view, or focus candidate.

Application services own use cases:

- `InboxService` captures Ideas, validates triage commands, replaces or removes
  Inbox Items, and optionally adds a first Project Task.
- `ProjectService` creates Projects/initial Tasks, derives workspace views, and
  owns Task create/edit/delete/reorder/assignment commands.
- `BreakdownService` batch-creates ordered Task drafts behind a replaceable
  manual/AI-capable application contract.
- `FocusService` completes Tasks and builds Focus Mode.
- `MissionControlService` derives Inbox count, Projects, blockers, and focus.

This separation keeps the domain rules reusable independently of PostgreSQL.

## Daily Review history

`DailyReviewResult` is an immutable historical record containing `date`,
energy, stress, motivation, optional notes, deterministic summary, and the
calculated attention budget. Date uses `YYYY-MM-DD`, while notes normalize
blank input to `null`.

Completing another review never replaces an earlier review, including when two
reviews share one date. Latest review is a repository query over historical
records; the Attention Engine continues to consume that latest result, so focus
behavior remains compatible while history becomes available for future trends.

## Compatibility limits

- The migration can infer Project and Area relationships only from data present
  in the loaded Item collection.
- An unknown explicit Project ID is discarded unless hierarchy identifies a
  valid Project.
- The Personal fallback provides a structural Area assignment but may not be
  present in the user's selected Area list.
- Generic legacy Item types remain readable, but only valid Tasks participate
  in action planning.
- Older Item snapshots can still be normalized by the pure helper, but the
  production PostgreSQL boundary does not read browser storage.
- PostgreSQL contains no ownership model yet. Cross-device access therefore
  targets one private dataset, not multiple users.
