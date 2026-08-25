# Atlas Focus Session

**Updated:** 2026-08-25
**Status:** Sprint 7.7 implemented

## Purpose

Focus Session lets the user work from Atlas without turning Atlas into a work
method. It answers one question: **what am I working on now?** The screen keeps
the current Task, its Project outcome, elapsed time, working notes, and a small
execution checklist visible. Projects, Inbox, Calendar, and planning controls
remain outside this screen.

This is a generic elapsed session. It has no intervals, breaks, goals, alarms,
or Pomodoro vocabulary.

## State ownership

Focus state belongs to the Task's date-scoped `DayPlanCommitment`:

```text
DayPlanCommitment
  taskId
  focused
  session
    elapsedSeconds
    startedAt | null
    notes | null
    checklist[]
```

`startedAt` represents only the open timer segment. While it is present, the UI
derives the visible elapsed value from the current clock. Pause, switch, and
complete add that segment to `elapsedSeconds` and clear `startedAt`. Atlas does
not write once per second, and a refresh can recover an active timer.

Notes and checklist steps are execution context for this Task today. They do not
change the permanent Task, create child Tasks, or affect Project progress.

## Interaction flow

```text
Daily Workspace: Focus
  -> FocusService selects the sole focused commitment
  -> Focus Session displays Task and related Project outcome

Start / Resume
  -> server records startedAt
  -> browser displays elapsed time locally

Pause
  -> server accumulates elapsed seconds
  -> server clears startedAt

Switch
  -> server pauses any running commitment
  -> server selects the requested Task
  -> next Task remains paused until explicit Resume

Complete
  -> server pauses the session and clears daily focus
  -> server completes the Task
  -> next committed Task becomes current
```

## Architecture

```text
FocusModeClient
  -> FocusFeature
  -> POST /api/atlas
  -> FocusService
  -> pure FocusSession + DailyWorkspace functions
  -> DayPlanRepository + ItemRepository + DailyReviewRepository
  -> Prisma repositories
  -> PostgreSQL
```

React owns only form drafts, loading/error feedback, and the one-second visual
timer refresh. `FocusService` owns every durable transition and uses an injected
clock and ID generator, making timer and checklist behavior deterministic in
tests. Related Project context is derived at read time from the existing Item
aggregate.

## Accessibility and responsive behavior

- Start, Pause, Complete, and Switch use native buttons.
- Notes and switch controls have explicit labels.
- Checklist steps use native checkboxes with action-specific accessible names.
- Successful changes use a polite live region; failures use an alert.
- The screen is one column on mobile and a calm two-column session grid on wide
  screens.
- Timer digits use tabular numerals and are not announced every second.

## Tradeoffs and future boundaries

- The checklist is deliberately lightweight. Work that needs scheduling,
  ownership, Project progress, or independent lifecycle should be a Task.
- Session history is not stored. Atlas retains the current day's accumulated
  value and working context only; analytics and estimate comparisons remain a
  future model.
- Completing a Task spans Day Plan and Item repositories without a shared unit
  of work. Writes are ordered, but a future record-level transaction boundary
  would make this atomic under concurrent or partial failure.
- Notifications, automatic switching, prescribed cycles, and background
  scheduling are outside this feature.
