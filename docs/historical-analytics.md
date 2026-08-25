# Historical analytics, patterns, and recommendations

Atlas historical intelligence is deterministic and service-only. There is no
UI, model provider, prompt, automatic execution, or write path in this layer.

## Dependency flow

```text
Daily Review history + Daily Wrap-Up history + current Items
  -> AnalyticsService
  -> AnalyticsReport
       + historical evidence -> PatternService -> Pattern[]
       + Calendar + current Review + Projects + Tasks
         -> RecommendationService -> Recommendation[]
```

Application services read repository and Calendar ports. All calculations and
rules live in pure TypeScript domain functions.

## Analytics definitions

Daily Review history can contain several records for one date. Analytics uses
the newest repository-ordered record for each date so one day never receives
extra weight.

| Metric | Deterministic definition |
| --- | --- |
| Average Energy, Stress, Motivation | Arithmetic mean of the selected daily Reviews. |
| Average Daily Attention | Mean stored `attentionBudget` for selected daily Reviews. |
| Completion Rate | Completed planned Task occurrences divided by all planned Task occurrences in Daily Wrap-Ups. |
| Planning Accuracy | `AsPlanned = 100`, `Partly = 50`, `Differently = 0`, averaged across wrap-ups. |
| Average Task Duration | Mean recorded Focus Session actual minutes, including actuals without an estimate. |
| Average Project Duration | For currently completed Projects, elapsed days from `createdAt` to `updatedAt`. |
| Average Time Blocks per Day | Mean stored `plannedTimeBlockCount` across Daily Wrap-Ups. |

Every metric carries `sampleSize`; absence produces `value: null`, never zero.

### Estimate variance

A `DurationVariance` exists only when the same wrap-up Task snapshot has both a
positive estimate and recorded Focus Session actual duration.

```text
variance minutes = actual minutes - estimated minutes
variance percent = variance minutes / estimated minutes × 100
accuracy = max(0, 100 - abs(variance percent))
```

Positive variance means the recorded work took longer. Negative means it took
less recorded time. Variances are stored in the returned `AnalyticsReport`,
not duplicated in PostgreSQL; immutable source snapshots make them exactly
reproducible.

### Task outcomes

- `completed`: wrap-up Task occurrences marked complete;
- `rescheduled`: unfinished occurrences explicitly carried to tomorrow;
- `postponed`: unfinished occurrences not carried to tomorrow;
- `cancelled`: historically planned Tasks that are currently Archived and
  never have a recorded completion.

These are planning evidence, not mutually exclusive lifetime event categories.
A Task can be rescheduled on one day and completed on another.

## Pattern rules

`PatternService` returns only rules meeting their minimum evidence threshold.
Every Pattern contains a stable ID, description, 0–100 confidence, evidence,
and a deterministic recommendation.

Current rules detect:

- consistently high energy in morning check-ins after at least three days;
- a 60-minute-or-longer Task unfinished in at least two appearances and at
  least two-thirds of its recorded appearances;
- a best weekday only after four wrap-ups and at least two samples for the
  leading weekday;
- average plan fit only after three wrap-ups.

Atlas does not currently detect late-evening productivity, common blocker
causes, interruptions, or context switching. Daily Wrap-Up does not store the
timestamps, blocker taxonomy, pause count, or ordered context transitions
required to support those claims.

## Recommendation rules

`RecommendationService` combines Analytics, Patterns, read-only Calendar,
today's Review, and current Projects and Tasks. It can suggest reducing today's
load, reserving deep work, reconsidering overdue work, completing a quick win,
splitting a large Project, reviewing a dormant Project, or delegating a Task
explicitly tagged `delegatable`.

Every result contains `why` and related Item IDs. Results contain no callback,
command, repository, or automatic execution capability. Calendar availability
is calculated through the existing provider-neutral `AvailabilityService`.

## Honest limitations

- Project `updatedAt` is the best current completion boundary but is not a
  dedicated `completedAt`; average Project duration is therefore a proxy.
- Archive is the only current deterministic cancellation proxy. Deleted Tasks
  cannot be classified as cancelled because deletion intent is not historical.
- Actual Task time covers Atlas Focus Sessions only.
- Analytics is recomputed on demand; there is no materialized analytics table.
- Services are not exposed through an HTTP feature or UI yet.
