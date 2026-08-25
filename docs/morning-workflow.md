# Morning Planning Session

The `/morning` experience is a guided decision path through the existing Daily
Review and Planner capabilities. It helps the user assemble a realistic day;
it does not make the day for them.

```text
Greeting
  -> Daily Review, when today has no Review
  -> read-only Calendar overview
  -> calculated Available Time
  -> Today's Workspace
  -> manual Time Block planning
  -> plan Review
  -> Start Day
```

The Greeting remains visible in the page header while the six interactive
steps progressively disclose one decision at a time. If today's historical
Review already exists, the session starts at Calendar. A saved draft resumes
at Today's Workspace, where the user's chosen Tasks are visible immediately.

## User control

- Calendar events are read-only and only reduce the calculated availability.
- Available Time is an explanation, not a scheduling action.
- Deterministic suggestions are optional evidence. They do not write a plan.
- A Task enters Today only after **Add to today**, a drop, or another explicit
  user command.
- A Time Block is created only after a user schedules a Task or submits the
  Time Block form.
- Review is read-only. **Start day** is the publication boundary.

No AI, prompt, model, or automatic scheduling path participates in this flow.
The existing `PlanningRulesEngine` can offer transparent, deterministic
options, but the user always accepts, changes, or ignores them.

## Draft lifecycle

```text
No plan <-> Draft -> Started
```

- Planning commands save a `Draft` immediately for resilience.
- **Save draft** explicitly persists the current Day Plan and stays in the
  session.
- **Resume later** saves the same draft and returns to the Workspace.
- **Discard** requires confirmation and is available only for a persisted
  draft. It deletes today's Day Plan, its ordered commitments, and Time Blocks.
- Discard also clears Task schedule projections created by those Time Blocks.
  It never deletes Tasks, changes Task status, or removes a Daily Review.
- A `Started` plan cannot be discarded.
- **Start day** changes the plan to `Started`. Mission Control and Focus Mode
  can then consume it as an accepted plan.

The step itself is presentation state and is not persisted. Resuming opens at
Today's Workspace rather than trying to recreate transient form focus or an
incomplete Daily Review.

## Application and persistence boundaries

```text
Morning UI
  -> ReviewFeature / PlannerFeature
  -> ReviewService / PlannerService
  -> repository contracts + domain engines + CalendarProvider
  -> PostgreSQL / configured Calendar adapter
```

The client imports feature interfaces only. `PlannerService` owns all Day Plan
commands, availability assembly, lifecycle checks, and Task schedule
synchronization. `DayPlanRepository.delete(date)` is implemented by both the
Prisma and in-memory adapters. PostgreSQL cascades a Day Plan deletion to its
commitments, Time Blocks, and block links, so no schema migration was needed.

Discard spans the Day Plan and Item repository boundaries. The service deletes
the draft first and then clears date-matching Task schedule projections. This
keeps repository contracts focused, but it is not a single cross-repository
transaction; a future unit-of-work boundary could make that operation atomic.

## Accessibility and responsive behavior

The progress indicator exposes `aria-current="step"` and changes from two
columns on mobile to three on tablet and six on wide screens. Every drag action
retains labeled button or form alternatives. Draft discard uses an explicit
confirmation, status changes are announced, and native controls retain shared
focus styles. All steps collapse to one reading column on small screens.
