# Time Blocking Engine

Atlas treats a Time Block as an intentional reservation of attention inside a
date-scoped Day Plan. It is an Atlas record, not an external Calendar event and
not evidence that linked work is complete.

## Model

```text
TimeBlock
  id
  title
  start / end          local minutes within the Day Plan date
  type                 Focus | Meeting | Break | Travel | Admin | Personal | Flexible
  locked
  linkedTasks[]
  linkedProjects[]
  notes
```

Start and end are local-day minute boundaries because the parent Day Plan owns
the calendar date and time zone. This avoids fabricating UTC instants before an
external Calendar boundary exists. The feature projection formats boundaries
as local clock values for inputs and display.

Task and Project links are explicit many-to-many context. Linking a Task also
adds it to today's ordered commitments if necessary. Unlinking it does not
remove that commitment. Projects provide outcome context but never become
executable Tasks.

## Rules

- Blocks must have a nonblank title, supported type, valid start/end boundary,
  and end on the same local day.
- Blocks in one Day Plan cannot overlap. Adjacency is allowed.
- Move preserves duration; resize changes the end boundary.
- Merge requires two adjacent, unlocked blocks of the same type. The earlier
  identity survives and links are combined without duplicates.
- Split requires an interior boundary and creates a second identity. Metadata
  and links are copied to both reservations.
- Duplicate copies metadata and links to an explicitly selected start while
  giving the new block its own identity and an unlocked state.
- Locked blocks may still be renamed, retyped, annotated, linked, or unlinked.
  They must be unlocked before move, resize, merge, split, or delete.
- Deleting a block never completes or deletes linked work.

For Task links, the earliest block in today's plan is projected into the Task's
optional `scheduledStart` and `scheduledEnd`. Moving, resizing, duplicating,
splitting, linking, and unlinking recompute that primary projection.

These rules live in the pure `Planning` domain and `PlannerService`. The UI only
collects explicit intent and invokes the corresponding feature command.

## Dependency flow

```text
Planner UI
  -> PlannerFeature
  -> HTTP feature adapter
  -> PlannerService
  -> Planning domain rules
  -> DayPlanRepository
  -> PrismaDayPlanRepository
  -> PostgreSQL
```

No feature component imports a repository or service implementation. The
repository persists the complete Day Plan aggregate in one transaction,
including ordered commitments, blocks, and link rows.

## Migration

`20260824180000_time_blocking_engine` evolves Sprint 7.1 data in place:

1. `end_minute` is calculated from the existing start and duration;
2. existing blocks become unlocked Focus blocks with empty notes;
3. the former optional Task reference becomes a `time_block_tasks` row;
4. the old duration and single-Task columns are removed after copying.

Rollback restores the prior shape and keeps the first Task link per block.
Additional links, Projects, type, lock state, and notes cannot be represented by
the old schema, so a production rollback requires a backup when that data must
be retained.

## External Calendar boundary

Time Blocks remain authoritative Atlas planning intent. A future Calendar
adapter may project them, detect conflicts, or propose a Calendar write, but it
must not change their identity or silently synchronize them. Provider event IDs
and synchronization status belong in a separate integration model.
