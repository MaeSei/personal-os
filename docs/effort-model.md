# Atlas Effort Model

**Sprint:** 7.5
**Date:** 2026-08-25
**Status:** Implemented as current Task metadata only.

## Purpose

The Effort Model gives a Task enough planning evidence to answer four separate
questions:

| Value | Meaning | Scale |
| --- | --- | --- |
| Estimated duration | How much clock time may be needed? | Optional positive minutes |
| Estimated effort | How much work or complexity is involved? | 1–5 |
| Estimated energy | How demanding will the work feel? | 1–5 |
| Confidence | How reliable does the current estimate feel? | Low, Medium, High, or not assessed |

Effort and energy are deliberately separate. A long repetitive Task can require
high effort but low energy; a short difficult conversation can require little
effort but high energy.

## Domain model

`src/domain/EffortModel.ts` exposes the current `TaskEstimate` projection and
the supported confidence vocabulary. It is pure TypeScript and has no React,
Next.js, repository, Prisma, database, browser, network, or AI dependency.

Atlas reuses the existing Item fields rather than duplicating them:

```text
estimatedDuration -> estimated duration in minutes
effort            -> estimated effort, 1–5
energyCost        -> estimated energy, 1–5
estimateConfidence -> optional Low / Medium / High confidence
```

`durationMinutes` remains the legacy duration compatibility field. Task writes
continue synchronizing it with `estimatedDuration`. Existing Attention and
Planning rules continue reading `effort` and `energyCost`, so introducing clear
estimate language does not change focus scoring or scheduling behavior.

## Data flow

```text
Shared TaskEditor
  -> TaskFeature / ProjectFeature / InboxFeature
  -> TaskService or InboxService
  -> createTask() / updateTask()
  -> ItemRepository
  -> Prisma Item row
  -> PostgreSQL
```

The same reusable estimate fields appear during Inbox-to-Task processing,
Project Task creation, and Task editing. Task detail, Workspace metadata, and
Planner cards read the same current values.

## Persistence

Duration, effort, and energy already had PostgreSQL columns and database checks.
Migration `20260825200000_effort_model` adds only the nullable
`estimate_confidence` enum column. Existing Tasks retain unknown confidence;
the migration does not fabricate a value.

The Prisma Item repository maps confidence alongside the existing current
estimate fields. No new repository or aggregate was introduced.

## Explicitly deferred

This sprint does not store actual duration, actual effort, actual energy,
estimate revisions, or comparison history. It does not analyse estimate
accuracy. Those are future product decisions and are intentionally absent from
the schema, domain, services, and UI.
