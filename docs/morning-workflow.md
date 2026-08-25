# Morning Workflow

The `/morning` experience turns the start of the day into one calm sequence:

```text
Daily Review
  -> Attention Budget
  -> read-only Calendar overview
  -> deterministic Planning Suggestions
  -> manual Planning Workspace
  -> Start Day
```

The steps are progressive disclosure over existing feature boundaries. Daily
Review still owns the capacity check. `PlannerService` still assembles Calendar,
work, available time, and rule-based suggestions. The Morning UI owns only the
current visible step and navigation between steps.

## Deterministic suggestions

Morning Planning uses the existing pure `PlanningRulesEngine`. It excludes
Waiting, Blocked, Completed, and Archived Tasks, respects active-Project next
actions, and ranks remaining candidates from explicit context, duration,
schedule, due date, and attention inputs. Suggestions never write or schedule
anything. A separate user command adds a Task to the draft.

No AI service, prompt, model, network fallback, or inferred schedule is involved.

## Draft and Start Day boundary

A `DayPlan` has one lifecycle state:

```text
No plan -> Draft -> Started
```

- Any explicit planning change persists a `Draft` so it can be resumed.
- **Save draft** also creates an empty draft when the user has not selected work.
- Reopening `/morning` resumes a stored draft at Manual Adjustments.
- **Start Day** changes the same plan to `Started`.
- Mission Control and Focus Mode consume only a `Started` plan. A draft is never
  mistaken for an accepted commitment.
- **Skip for now** leaves the workflow without creating a plan. **Skip check-in**
  continues to manual planning without inventing an attention budget.

Planning commands continue to save immediately for resilience. The lifecycle
is a publication boundary, not a client-side transaction or rollback system.

Existing Day Plans predate this distinction and were already visible as
accepted work. The migration marks those rows `Started`; newly created plans
default to `Draft`.

## Layering

```text
Morning UI
  -> ReviewFeature / PlannerFeature
  -> ReviewService / PlannerService
  -> repository contracts + PlanningRulesEngine + CalendarProvider
  -> PostgreSQL / configured Calendar adapter
```

The browser receives feature interfaces through the existing HTTP boundary.
It never imports a repository, Prisma, or a concrete service. Review results
remain historical records; the Day Plan lifecycle is persisted separately.

## Accessibility and responsive behavior

The step indicator exposes `aria-current="step"`. Every drag interaction in the
manual workspace retains its existing labeled button alternative. Native
buttons provide keyboard focus, and the layout collapses to one reading column
on small screens. Calendar data remains explicitly labeled read-only.
