# Planning Rules Engine

Atlas uses `PlanningRulesEngine` to produce deterministic, read-only Planning
Suggestions. It is pure TypeScript: no React, Next.js, repositories, database,
network, time lookup, random values, or AI.

## Boundary

```text
PlannerService
  -> PlanningRulesEngine.getSuggestions(input)
     -> PlanningSuggestion[]
  -> Planner UI projection
     -> UI may render or ignore suggestions
```

The engine never accepts a suggestion, changes Task status, creates a Time
Block, or writes a Day Plan. The application supplies explicit inputs and the UI
retains control over presentation.

## Input

`PlanningRulesInput` contains:

- the complete Item aggregate;
- selected calendar date;
- remaining available minutes, or `null` when unknown;
- optional current context;
- Task IDs already accepted into the plan;
- an optional maximum result count.

The engine does not read the clock. This makes the same input produce the same
output in every environment.

## Eligibility

A suggestion must be an available Task:

- Task status is `Active` or `Today`;
- Task is not already accepted into the Day Plan;
- standalone Task has no Project association; or
- Task is the first available action in an active Project.

Each active Project contributes at most one Task. A Waiting or Blocked Task at
the front of a Project does not hide the next genuinely available Task.

The following never become suggestions:

- Waiting;
- Blocked;
- Someday;
- Completed;
- Archived;
- Tasks inside inactive Projects;
- Projects and non-Task Items.

## Deterministic scoring

Every eligible Task starts with its clamped `attentionScore` and receives these
transparent adjustments:

| Rule | Adjustment |
| --- | ---: |
| Already scheduled for the selected date | +35 |
| Matches the current context | +30 |
| Estimated duration fits remaining time | +25 |
| Due on or before the selected date | +20 |
| Explicit `Today` status | +15 |
| Has a different explicit context | -10 |
| Estimate exceeds remaining time | -20 |

Missing duration and context remain neutral. They do not make work unavailable
and the engine does not invent estimates.

Context comparison trims whitespace, ignores case, and treats an optional
leading `@` as presentation syntax. Time matching requires a positive stored
estimate at or below the supplied remaining minutes.

Stable ties use:

1. higher attention score;
2. lower energy cost;
3. older creation time;
4. lexical Task ID.

The engine returns matched rule codes and one deterministic explanation with
each Task. It does not expose a productivity grade in the UI.

## Application integration

`ServiceContainer` constructs one engine and injects it into `PlannerService`.
The service supplies the Day Plan's accepted IDs and remaining minutes after
Atlas Time Blocks. It derives the result limit from today's attention budget,
maps domain Tasks to UI-safe Planner Tasks, and returns the suggestions as part
of `DailyPlannerData`.

The existing `PlanningArea` chooses whether to render the returned array. An
empty array produces no suggestion region. Suggestions remain advisory; adding
one to today is a separate feature command.

## Tests

Domain tests cover:

- every unavailable lifecycle state;
- context normalization and preference;
- fitting and non-fitting estimates;
- Project status and one-next-action behavior;
- accepted Task exclusion and limits;
- stable tie-breaking;
- invalid date, capacity, and limit input.

Planner integration tests verify that the application still returns the
expected domain suggestions after mapping.

## Intentional limits

- Current context is optional and currently supplied only when the application
  has explicit context evidence.
- External Calendar events do not yet calculate available minutes.
- The engine does not cluster multiple selections or construct a whole-day
  schedule.
- No AI fallback exists. A future suggestion strategy can implement a separate
  boundary, but it must preserve explicit acceptance and explainability.
