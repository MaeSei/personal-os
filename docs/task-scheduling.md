# Task Scheduling

Task scheduling is optional and always intentional. Atlas separates metadata
that helps a user choose a time from the Time Block that actually reserves it.

## Task fields

| Field | Meaning |
| --- | --- |
| `estimatedDuration` | Optional positive estimate; it is not changed by resizing a block. |
| `effort` | Current estimated amount or complexity, from 1–5. |
| `energyCost` | Current estimated personal demand, from 1–5. |
| `estimateConfidence` | Optional Low, Medium, or High confidence in the current estimate. |
| `preferredTime` | Optional Anytime, Morning, Afternoon, or Evening preference. |
| `contexts` | Optional set of places, tools, or modes where the Task can run. |
| `scheduledStart` | Start instant of today's earliest linked Time Block. |
| `scheduledEnd` | End instant of today's earliest linked Time Block. |

The scheduled pair is either entirely present or entirely absent, and end must
follow start. `durationMinutes`, `context`, `preferredContext`, and
`scheduledDate` remain as compatibility fields while older records and feature
inputs are migrated. The first canonical context feeds both legacy context
fields.

Preferences are passive evidence. Atlas does not turn them into a Time Block,
rank the user, or infer a schedule.

These fields describe only the current estimate. Actuals, comparison, and
estimate history are outside this implementation.

## Interaction flow

```text
Task
  -> Schedule
  -> Available Slot
  -> server revalidates fit
  -> Time Block persisted
  -> Task primary schedule projected
```

A Task can be dragged directly onto a displayed Available Slot. The service
uses its current estimate, or a 30-minute allocation when no estimate exists,
and creates a Focus block at the slot start only when the complete allocation
still fits. The same action is available through a native form inside each slot
for touch and keyboard use. The custom Time Block form remains the explicit
alternative for a different start, end, or block type.

Scheduled work supports:

- unschedule by unlinking the Task from every block in today's plan;
- move while preserving block duration;
- duplicate at an explicitly chosen start with a new block identity;
- split at an explicitly chosen interior boundary;
- multiple blocks for the same Task.

Direct slot scheduling rejects an already scheduled Task; the existing block's
move or duplicate action is the deliberate way to change or repeat its
allocation. These commands update scheduling fields only. They never change
Task status and never imply completion.

When a Task has multiple blocks, the earliest block is its primary
`scheduledStart`/`scheduledEnd` projection. Duplicate and split preserve links;
moving blocks recomputes which allocation is primary. Unscheduling clears the
projection but keeps the Task committed to today.

## Application boundary

`PlannerService` owns scheduling. `scheduleTaskInSlot` reloads the current Day
Plan and Calendar evidence, asks the pure `AvailabilityService` for current
slots, and validates the Task duration before it writes. It saves the Day Plan through
`DayPlanRepository`, converts local Day Plan boundaries into real instants using
the plan time zone, then synchronizes affected Task projections through
`ItemRepository`. UI calls only `PlannerFeature` commands.

The repositories expose separate aggregate transactions, so the two writes are
ordered rather than globally atomic. Time Blocks remain canonical and the Task
projection can be repaired from them. A future record-level scheduling
repository can make both writes one PostgreSQL transaction without changing the
feature contract.

## Persistence migration

`20260825090000_task_scheduling` adds the scheduled pair, estimate, preference
enum, and preferred context to Item rows. It copies previous duration and
context values into the new canonical columns. It creates no Tasks, schedules,
recurrence rules, or notifications.

Interactive Time Blocking requires no additional migration. It reuses the
existing `DayPlan`, `TimeBlock`, Task/Project links, and scheduled timestamp
columns.

## Explicit non-goals

- recurring Tasks;
- reminders or notifications;
- automatic scheduling from preferences;
- external Calendar writes.
