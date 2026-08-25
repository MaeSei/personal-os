# Task Scheduling

Task scheduling is optional and always intentional. Atlas separates metadata
that helps a user choose a time from the Time Block that actually reserves it.

## Task fields

| Field | Meaning |
| --- | --- |
| `estimatedDuration` | Optional positive estimate; it is not changed by resizing a block. |
| `preferredTime` | Optional Anytime, Morning, Afternoon, or Evening preference. |
| `preferredContext` | Optional place, tool, or mode preference. |
| `scheduledStart` | Start instant of today's earliest linked Time Block. |
| `scheduledEnd` | End instant of today's earliest linked Time Block. |

The scheduled pair is either entirely present or entirely absent, and end must
follow start. `durationMinutes`, `context`, and `scheduledDate` remain as
compatibility fields while older records and feature inputs are migrated.

Preferences are passive evidence. Atlas does not turn them into a Time Block,
rank the user, or infer a schedule.

## Interaction flow

```text
Task
  -> Schedule
  -> Task preselected in Planner
  -> user chooses start/end and confirms
  -> Time Block persisted
  -> Task primary schedule projected
```

A Task can reach Schedule from its Project row, by dragging a Planner Task onto
the creation area, or by selecting it in the form. Dragging only preselects the
Task; it never chooses a time or writes data.

Scheduled work supports:

- unschedule by unlinking the Task from every block in today's plan;
- move while preserving block duration;
- duplicate at an explicitly chosen start with a new block identity;
- split at an explicitly chosen interior boundary;
- multiple blocks for the same Task.

When a Task has multiple blocks, the earliest block is its primary
`scheduledStart`/`scheduledEnd` projection. Duplicate and split preserve links;
moving blocks recomputes which allocation is primary. Unscheduling clears the
projection but keeps the Task committed to today.

## Application boundary

`PlannerService` owns scheduling. It validates and saves the Day Plan through
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

## Explicit non-goals

- recurring Tasks;
- reminders or notifications;
- automatic scheduling from preferences;
- external Calendar writes.
