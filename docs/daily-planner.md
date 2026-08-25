# Daily Planner / Planning Workspace

The Daily Planner is now presented as Atlas's Planning Workspace. It is an
intentional day-building surface, not a Calendar replacement, and it does not
automatically schedule work.

## Experience

The `/planner` screen keeps the plan primary while surrounding it with visible,
collapsible context:

```text
Morning orientation
  -> Search
  -> Planner (capacity, choices, Time Blocks)
  -> Calendar
  -> Projects / Tasks / Inbox
  -> Quick Capture
```

The Planner panel contains accepted Tasks in their persisted order. Tasks can
be added or reordered with native drag and drop. The same operations are always
available through labeled buttons, which gives keyboard, touch, and assistive
technology users a complete alternative to dragging.

Dragging a Task onto the Time Block creation area preselects it for scheduling;
it does not create a reservation. The user still chooses start/end and confirms
the block. Project Task rows also expose a Schedule link that opens this same
prefilled flow.

Time Blocks are explicit attention reservations. A user chooses start/end,
type, lock state, optional notes, and optional Task or Project context. Blocks
can then be moved, resized, merged, split, linked, unlinked, or deleted. Atlas
rejects overlap rather than silently moving either block.
Blocks can also be duplicated at an explicitly chosen start. A duplicate keeps
its work context but receives a new identity and starts unlocked.

The Calendar panel consumes the read-only `CalendarProvider` boundary. The
current `MockCalendarProvider` is disconnected and empty by default, so Atlas
creates neither sample events nor implied availability. Tests may inject static
events; future ICS or Google adapters can replace the mock without changing the
Planner.

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
- deterministic, non-writing suggestions;
- a normalized read-only Calendar projection for the current local day.

It exposes explicit commands for placing, moving, and removing Tasks and for
creating, updating, moving, resizing, locking, deleting, merging, splitting,
linking, and unlinking Time Blocks. Every command
validates the domain change, persists it through `DayPlanRepository`, and
returns a fresh render-ready projection. The UI performs no business eligibility
filtering, sorting, capacity calculation, or persistence orchestration.

`placeTasks(ids)` is the batch form of explicit acceptance. It validates the
full selection, removes duplicate identities, and performs one Day Plan save.
Workspace text search and disclosure remain presentation state, not business
logic.

`PlanningRulesEngine` excludes unavailable lifecycle states and inactive
Projects, then prefers today's intent, current-context matches, Tasks that fit
remaining time, due work, and higher-impact work. Stable tie-breakers keep the
result reproducible. The Daily Review budget limits how many suggestions are
returned. Suggestions never alter the Day Plan; accepting one is a separate
user command. See `docs/planning-rules-engine.md` for exact rules and weights.

## Persistence model

```text
DayPlan (one per date)
  |-- ordered DayPlanTask references
  `-- TimeBlocks
        |-- Task links
        `-- Project links
```

`DayPlanRepository.get(date)` loads one aggregate and `save(plan)` persists it.
`PrismaDayPlanRepository` implements the contract with `day_plans`,
`day_plan_tasks`, `time_blocks`, `time_block_tasks`, and
`time_block_projects` inside one transaction. The mock repository supports
service tests without PostgreSQL.

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

- Available time defaults to eight hours until working hours or Calendar
  availability policy is implemented. Planned block duration is subtracted from
  this visible baseline; external events are currently context, not arithmetic.
- Commands save immediately into a draft for recovery. `Start Day` is the
  explicit publication boundary; Atlas does not offer multi-step rollback.
- Native drag and drop covers desktop efficiency; explicit controls are the
  reliable keyboard and mobile path.
- Rule-based suggestions provide transparent guidance now. A future AI planner
  can implement a suggestion boundary, but must still require explicit user
  acceptance before `PlannerService` writes the plan.
