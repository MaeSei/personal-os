# Calendar Workspace

The `/planner` route is Atlas's Calendar Workspace. It combines intentional
planning with read-only calendar awareness without turning Atlas into an
external Calendar editor.

## Product question

The screen answers:

> What can I realistically choose today around the commitments that already
> exist?

Projects provide outcome context, Tasks provide actionable work, Calendar
events show fixed external commitments, Available Slots show genuine capacity,
and Time Blocks record the user's intentional reservations.

## Information hierarchy

```text
Morning orientation and capacity
  -> Calendar Workspace
       -> Today's Tasks
       -> Calendar events + Available Slots
       -> Atlas Time Blocks
  -> Projects
  -> Available Tasks
  -> Inbox
  -> Quick Capture
```

Calendar events, Available Slots, and Time Blocks now share one Day Timeline
section. The previous second Calendar panel was retired because it made users
mentally reconcile two distant parts of the screen.

Calendar connection management remains separate from planning content, but is
collapsed by default. Sync configuration is occasional administration; the
read-only event projection is the information needed while planning.

## Interaction model

### Task to Time Block

```text
Available Task or Today's Task
  -> drag to Available Slot
  -> PlannerService revalidates current availability
  -> linked Focus Time Block is persisted
  -> Task schedule projection is updated
  -> Task lifecycle status is unchanged
```

Every Available Slot also contains a native Task selector and Schedule button.
Dragging is therefore an efficiency enhancement rather than a requirement for
touch, keyboard, or assistive technology users.

### Existing Time Blocks

Each block keeps a compact summary visible. **Edit** progressively reveals:

- title, type, and notes;
- move, resize, split, and duplicate controls;
- Task and Project links;
- lock, merge, and delete actions.

Scheduled Tasks also retain **Remove time**, which unlinks the Task and clears
its schedule projection without removing it from today's chosen work. Deleting
a block removes the reservation; it does not complete the Task.

### Calendar events

External events remain read-only. Busy accepted events reduce Available Slots.
Declined and transparent events do not. Atlas never drags, resizes, deletes, or
publishes an external event from this workspace.

## Responsive layout

### Desktop

At the Atlas desktop boundary, the Calendar Workspace and context rail form two
columns. The larger column contains Today's Tasks and the Day Timeline. The
smaller column keeps Projects, Available Tasks, and Inbox visible. Calendar
events and Available Slots share a two-column row inside the timeline.

### Tablet

The main workspace returns to one column so planning controls do not become
cramped. Calendar events and Available Slots become two columns only when the
viewport has enough room. Projects and Task context follow the primary day
surface as independently collapsible panels.

### Mobile

Document order becomes the interface: Today's Tasks first, then Calendar and
Available Slots, then Time Blocks and supporting context. All controls use
native buttons, selects, and time inputs. No action depends on precise dragging
or a permanently visible sidebar.

## Architecture

```text
PlanningWorkspace (composition and local disclosure/search state)
  -> PlannerFeature
  -> PlannerService
     -> PlanningRulesEngine
     -> AvailabilityService
     -> CalendarProvider (read-only)
     -> DayPlan / Item repositories
```

The UI does not calculate free time, validate overlaps, or persist schedules.
`AvailabilityService` owns open-slot calculation. `PlannerService` re-reads the
current plan and Calendar evidence before every slot scheduling command. Time
Blocks remain canonical scheduling records; Task start/end fields remain a
projection for cross-feature display.

No new persistence model or migration is required for this sprint.

## Empty and loading states

- No Calendar connection explains that events are unavailable without
  fabricating examples.
- No Calendar events preserves the provider's honest sync message.
- No Available Slots explains which constraints fill the day.
- No Time Blocks encourages an intentional reservation without implying that
  the user should fill every gap.
- Existing Planner loading and error boundaries continue to cover the complete
  workspace projection.

## Tradeoffs

- The current Day Timeline is a calm grouped view, not a pixel-based Calendar
  grid. Exact native time controls are more reliable across desktop, tablet,
  mobile, and keyboards.
- Calendar connection settings are collapsed because they are lower-frequency
  than daily planning.
- Native HTML drag and drop remains desktop-oriented. The explicit scheduling
  form is the primary portable interaction.
- Calendar events and Time Blocks remain different sources of truth. Combining
  their presentation does not merge their persistence or permissions.
