# Daily Planner / Planning Workspace

The Daily Planner is now presented as Atlas's Planning Workspace. It is an
intentional day-building surface, not a Calendar replacement, and it does not
automatically schedule work.

## Experience

The `/planner` screen is now the Calendar Workspace. It keeps the plan primary while surrounding it with visible,
collapsible context:

```text
Morning orientation
  -> Search
  -> Calendar Workspace (capacity, choices, Calendar, slots, Time Blocks)
  -> Projects / Tasks / Inbox
  -> Quick Capture
```

The Planner panel contains accepted Tasks in their persisted order. Tasks can
be added or reordered with native drag and drop. The same operations are always
available through labeled buttons, which gives keyboard, touch, and assistive
technology users a complete alternative to dragging.

The Day Timeline shows read-only Calendar events beside open slots calculated from the 09:00–17:00 working
window, configured breaks, selected Calendar events, and existing Atlas Time
Blocks. Dragging a Task onto one of those slots creates a Focus block at the
slot start after the application service revalidates that the Task still fits.
Every slot also offers a native select-and-submit path for keyboard, touch, and
assistive technology users.

The custom Time Block form remains available when the user needs a different
start, duration, type, lock state, or unassigned reservation. Dropping a Task on
that custom area only preselects it; the explicit form remains non-writing until
submission.

Time Blocks are explicit attention reservations. A user chooses start/end,
type, lock state, optional notes, and optional Task or Project context. Blocks
can then be moved, resized, merged, split, linked, unlinked, or deleted. Atlas
rejects overlap rather than silently moving either block.
Blocks can also be duplicated at an explicitly chosen start. A duplicate keeps
its work context but receives a new identity and starts unlocked.

The Calendar panel consumes the read-only `CalendarProvider` boundary. When
configured, `GoogleCalendarProvider` supplies OAuth and incremental API sync to
`CalendarService`; the Planner itself remains provider-neutral. Users can
connect, choose calendars, refresh, and disconnect through `CalendarFeature`.
Atlas creates no sample events. Cached Google events remain read-only external
evidence, but busy accepted occurrences now reduce the open-slot projection.
See `docs/calendar-integration.md` and `docs/calendar-workspace.md`.

Projects, available Tasks, and Inbox summaries are visible in a context rail.
Search filters that context without hiding the accepted plan. Available Tasks
support checkbox multi-select and one atomic **Add selected** command. Projects
and Inbox Items cannot enter Today directly because only actionable Tasks belong
there. See `docs/planning-workspace.md` for responsive and interaction details.

## Application service

`PlannerService` is the only service responsible for the Planner use case. It
composes:

- the current date and display locale;
- active Projects and actionable Tasks;
- Inbox count;
- today's Daily Review and attention budget;
- the persisted Day Plan;
- deterministic, non-writing placement suggestions;
- a normalized read-only Calendar projection for the current local day.
- pure Availability Engine results for capacity and schedulable slots.

It exposes explicit commands for placing, moving, and removing Tasks, placing a
Task in a revalidated available slot, and for
creating, updating, moving, resizing, locking, deleting, merging, splitting,
linking, and unlinking Time Blocks. Every command
validates the domain change, persists it through `DayPlanRepository`, and
returns a fresh render-ready projection. The UI performs no business eligibility
filtering, sorting, capacity calculation, or persistence orchestration.

`placeTasks(ids)` is the batch form of explicit acceptance. It validates the
full selection, removes duplicate identities, and performs one Day Plan save.
Workspace text search and disclosure remain presentation state, not business
logic.

`PlanningRulesEngine` excludes unavailable lifecycle states, unresolved
dependencies, and inactive Projects. It combines exact Available Slots with
Task duration, Review energy, current context, dates, and impact, then returns
non-overlapping proposed windows. Stable tie-breakers keep the result
reproducible. The Daily Review budget limits how many suggestions are returned.
Loading a suggestion never alters a Task or Day Plan. **Add to today** and
**Plan at HH:MM** are separate user commands, and scheduling revalidates the
slot before writing. See `docs/planning-rules-engine.md` for exact rules.

## Persistence model

```text
DayPlan (one per date)
  |-- ordered DayPlanTask references
  `-- TimeBlocks
        |-- Task links
        `-- Project links
```

`DayPlanRepository.get(date)` loads one aggregate, `save(plan)` persists it,
and `delete(date)` removes a discarded draft.
`PrismaDayPlanRepository` implements the contract with `day_plans`,
`day_plan_tasks`, `time_blocks`, `time_block_tasks`, and
`time_block_projects`. Save is transactional; delete relies on the existing
cascade relationships. The mock repository supports service tests without
PostgreSQL.

Task order belongs to the Day Plan, not to the underlying Project hierarchy.
A Task estimate also remains separate from a block's start/end allocation. These
boundaries let the same Task be planned differently on different dates without
corrupting its durable work definition.

## Cross-feature behavior

A planning change persists a resumable `Draft`. Only **Start Day** publishes its
order to Mission Control and Focus Mode. If no started plan exists, those
screens retain the existing rule-based focus behavior. Legacy Tasks with
`Today` status are projected into an unsaved initial plan so current
installations do not lose their work during rollout. See
`docs/morning-workflow.md` for the lifecycle and guided experience.

Universal Capture remains the single capture mechanism. The Planner's Quick
Capture section points to the persistent desktop entry and mobile floating
button instead of duplicating capture state or commands.

## Intentional tradeoffs

- The production composition currently uses a visible 09:00–17:00 local
  working window and no configured breaks. `PlannerContext` accepts different
  working windows and breaks, but user-owned settings are not implemented yet.
- Commands save immediately into a draft for recovery. `Start Day` is the
  explicit publication boundary. The Morning Session can discard the complete
  date-scoped draft, but Atlas does not offer per-command undo.
- Native drag and drop covers desktop efficiency; explicit controls are the
  reliable keyboard and mobile path.
- Rule-based suggestions provide transparent guidance now. A future AI planner
  can implement a suggestion boundary, but must still require explicit user
  acceptance before `PlannerService` writes the plan.
