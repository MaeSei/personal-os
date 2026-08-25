# Planning Rules Engine v2

Atlas uses `PlanningRulesEngine` to produce deterministic, read-only placement
suggestions. It is pure TypeScript: no React, Next.js, repositories, database,
network, clock lookup, random values, or AI.

## Boundary

```text
AvailabilityService -> Available Slots
Task / Review / Context / dependency evidence
              |
              v
PlanningRulesEngine.getSuggestedPlacements(input)
              |
              v
SuggestedPlacement[] (advice only)
              |
              v
User accepts -> PlannerService.scheduleTaskInSlot(...)
```

The engine never accepts a suggestion, changes Task status, creates a Time
Block, or writes a Day Plan. `getSuggestions()` remains available for existing
callers that need ranked Tasks without exact placement.

## Inputs and output

`PlanningPlacementInput` contains:

- the complete Item snapshot and selected calendar date;
- exact Available Slots as local-day start/end minutes;
- optional available energy and current context;
- explicit Task-to-prerequisite Task IDs;
- Task IDs already accepted into the plan;
- an optional maximum result count.

Each `SuggestedPlacement` contains the Task, start, end, duration, matched rule
codes, and a deterministic explanation. Slots are validated, sorted, and
coalesced in memory. Inputs and Tasks are never mutated.

## Eligibility

A placement candidate must be an available Task:

- status is `Active` or `Today`;
- it is not already accepted into the Day Plan;
- every declared prerequisite exists in the supplied snapshot and is
  `Completed`;
- it fits one remaining contiguous Available Slot;
- it is standalone, or the first dependency-ready action in an active Project.

Waiting, Blocked, Someday, Completed, and Archived work is excluded. Inactive
Projects, Projects themselves, and non-Task Items are also excluded. A missing
prerequisite is unresolved rather than optimistically treated as complete.

Atlas does not yet persist a canonical Task dependency graph. The application
therefore supplies an empty dependency list today, while tests and future
dependency-capable callers can supply explicit evidence through the domain
contract. This avoids inventing dependencies from hierarchy, status, or text.

## Deterministic ranking

Every eligible Task starts with its clamped `attentionScore` and receives these
transparent adjustments:

| Rule | Adjustment |
| --- | ---: |
| Already intended for the selected date | +35 |
| Matches current context | +30 |
| Estimated duration fits the largest available slot | +25 |
| Energy requirement is at or below available energy | +25 |
| Due on or before the selected date | +20 |
| Explicit `Today` status | +15 |
| Has a different explicit context | -10 |
| Exceeds the largest available slot | -20 |
| Energy requirement exceeds available energy | -30 |

Energy and context mismatches reduce priority but do not make otherwise
actionable work disappear. Duration and hard dependencies are different: a
Task cannot receive a placement when it cannot fit contiguously or its
prerequisites are unresolved.

Stable ties use higher attention, lower energy, older creation time, then
lexical Task ID. Missing duration uses one documented 30-minute planning window
so the engine can return a concrete proposal without modifying the Task's
stored estimate. Missing energy or current context remains neutral.

## Slot allocation

Ranked candidates are considered once, in stable order. Each Task takes the
earliest remaining slot that can contain its full duration. The interval is
reserved only inside the local calculation before the next candidate is
considered. A large Task that cannot fit is skipped and smaller candidates are
still considered.

This is deliberately a proposal builder, not an optimizer. It does not split a
Task, move an existing Time Block, use hidden gaps, or claim that the proposed
order is globally optimal. The simple greedy rule is inspectable and produces
the same answer for the same inputs.

## Application integration

`ServiceContainer` constructs one engine and injects it into `PlannerService`.
The service combines Available Slots from `AvailabilityService`, today's Review
energy, current context, accepted Task IDs, and Item data. It maps domain
placements into `DailyPlannerData` without saving anything.

The Planner renders the proposed window and offers two explicit choices:

- **Add to today** accepts only the Task into the ordered Day Plan;
- **Plan at HH:MM** invokes the existing scheduling command, which revalidates
  current availability before it creates a Time Block.

The separation prevents a stale suggestion from becoming an automatic write.
Blocked state, Calendar evidence, and slots can change between read and
acceptance; `PlannerService` remains the authority at the command boundary.

## Tests

The comprehensive domain suite covers lifecycle exclusion, duration fit,
contiguous slot reservation, default duration, energy and context preference,
completed, unresolved, and missing prerequisites, Project next-action fallback,
slot normalization, deterministic ordering, input immutability, and invalid
input. Planner integration tests verify exact projected windows and prove that
loading suggestions creates no Time Block or Task schedule.

## Intentional limits

- Dependencies are explicit engine input until Atlas introduces a canonical
  persisted dependency model.
- Available energy is one daily level; it is not depleted after each proposed
  Task because Atlas has no validated energy-consumption model.
- Context is one current execution context; `Anywhere` and unconstrained Tasks
  remain compatible through `ContextEngine`.
- Suggestions do not resize, merge, move, or remove existing Time Blocks.
- No AI fallback exists. A future strategy may implement the same proposal
  boundary, but deterministic eligibility and explicit acceptance remain.
