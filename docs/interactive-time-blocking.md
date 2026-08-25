# Interactive Time Blocking

Interactive Time Blocking turns an actionable Task into planned work without
changing its lifecycle status.

```text
Planner Task drag or accessible form
  -> PlannerFeature.scheduleTaskInSlot(taskId, slotStart)
  -> PlannerService reloads Day Plan + Calendar
  -> AvailabilityService recalculates open slots
  -> linked Focus Time Block + Day Plan commitment
  -> DayPlanRepository
  -> Task scheduledStart / scheduledEnd projection
```

## Decisions

- A direct drop starts at the selected slot boundary and uses the Task's
  current duration estimate. A Task without an estimate receives a transparent
  30-minute allocation.
- The service rejects stale or too-small slots rather than truncating the Task
  estimate or silently moving other work.
- Direct scheduling adds the Task to today's ordered commitments when needed.
  It does not change `Active`/`Today` status and does not complete the Task.
- A Project Task links both the Task and its Project to the created Focus block,
  preserving outcome context.
- An already scheduled Task must use Move or Duplicate. This prevents an
  accidental second allocation from a repeated drop.
- The custom creation form remains available for non-Focus blocks and precise
  manual decisions.

## Interaction parity

Desktop users can drag any unscheduled Planner Task onto a visible slot.
Keyboard, touch, and assistive-technology users can expand **Schedule without
dragging**, select the same Task, and submit the same command. Move, resize,
delete, unschedule, and duplicate remain explicit forms or buttons and reuse the
existing application commands.

## Persistence

No migration is required. Time Blocks and their links are already persisted in
the Day Plan aggregate. The earliest linked block remains the Task's primary
schedule projection. Deleting or unlinking that block recalculates the
projection; unscheduling keeps the Task in today's commitment list.
