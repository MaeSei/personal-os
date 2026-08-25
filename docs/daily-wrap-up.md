# Daily Wrap-Up

Daily Wrap-Up is Atlas's explicit end-of-day boundary. It closes the planning
loop without scoring the user, coaching them, or changing work automatically.
The route is `/wrap-up` and the Workspace exposes it as a deliberate action.

## Experience

The screen answers one question: **what happened to today's intention?** It
shows, in order:

1. completion and recorded-time metrics;
2. completed and incomplete Tasks from today's Day Plan;
3. today's Atlas Time Blocks and read-only Calendar evidence;
4. two short reflections and optional notes;
5. an explicit carry-forward choice for each unfinished Task.

The user must answer whether the day matched the plan and whether time
estimates were accurate. `NotEnoughData` is a first-class estimate answer so a
day without recorded time does not force a false judgement.

## Evidence and metrics

Daily Wrap-Up snapshots evidence at submission time:

- completion comes from each planned Task's current status;
- estimates come from the Task's current estimated duration;
- actual duration comes only from persisted Focus Session elapsed time;
- planned minutes are the sum of today's Time Block boundaries;
- Calendar events are counted from the read-only provider snapshot.

Atlas does not infer actual duration from Calendar events, Time Blocks, Task
timestamps, or browser time. A zero or unavailable Focus Session duration is
stored as `null` on the Task snapshot. A running Focus Session is sampled at
submission; completing the wrap-up does not silently pause or complete it.

## Carry-forward semantics

Unfinished work never moves by default. A checked Task is appended once to
tomorrow's Draft Day Plan, preserving the existing order and deduplicating its
identity. Carry-forward does not:

- change Task status;
- copy a Time Block;
- assign a scheduled time;
- modify the Task estimate.

If tomorrow has already started, Atlas refuses the carry-forward rather than
silently modifying an active day.

## Architecture

```text
/wrap-up
  -> WrapUpFeature (HTTP adapter)
  -> /api/atlas
  -> WrapUpService
     -> DailyWrapUpRepository
     -> DayPlanRepository
     -> ItemRepository
     -> CalendarProvider
  -> PrismaDailyWrapUpRepository
  -> PostgreSQL
```

`WrapUpService` assembles the evidence and owns carry-forward orchestration.
Pure functions in `src/domain/DailyWrapUp.ts` validate the reflection and
calculate metrics. React owns only form state, disclosure, and transport.

`DailyWrapUp` and `DailyWrapUpTask` are historical snapshots. Task identifiers
and titles are copied without a foreign key to `items`, so later Task editing
or deletion cannot rewrite the record of an earlier day. One database-unique
wrap-up is allowed per calendar date.

## Persistence and migration

Migration `20260825233000_daily_wrap_up` creates:

- `daily_wrap_ups` for reflection, aggregate metrics, notes, and creation time;
- `daily_wrap_up_tasks` for per-Task outcome, estimate, recorded duration, and
  carry-forward evidence;
- `plan_assessment` and `estimate_assessment` PostgreSQL enums.

The migration inserts no data and changes no Item, Day Plan, Time Block, or
Calendar row. The committed `down.sql` supports disposable rollback testing;
production rollback should use a forward migration after data exists.

## Current limits

- There is no Task completion timestamp, so completion is a submission-time
  snapshot rather than an event history.
- Actual duration is available only for Atlas Focus Sessions.
- Saving tomorrow's Day Plan and the historical wrap-up crosses two repository
  contracts and is ordered, but not one database transaction.
- No AI reads or generates the reflection. Notes are stored verbatim and are
  not analysed.
