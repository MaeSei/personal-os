# Atlas Project Dashboard

**Sprint:** 7.3
**Date:** 2026-08-25
**Status:** Implemented

## Purpose

Project Dashboard is the canonical workspace for understanding one outcome.
It keeps the full Project visible without turning the page into a generic
analytics dashboard. The hierarchy is outcome, exceptions, meaningful
progress, ordered work, timing, memory, and related context.

## Screen composition

```text
ProjectDetailClient
└── ProjectDetail
    ├── PageHeader
    ├── ProjectHero                 Outcome, progress, remaining effort
    ├── Blocked / Waiting           Existing Task exception collections
    ├── ProjectMilestones           Create, achieve, reopen, remove
    ├── ProjectTaskSection          Rapid add, grouping, ordering, editing
    ├── ProjectTimeline             Dates, completions, Milestones
    ├── Completed / Unscheduled     Supporting Task lenses
    ├── ProjectNotes                Create, pin, unpin, remove
    ├── RelatedProjects             Bidirectional links
    └── ProjectAssistantPlaceholder Future boundary only
```

Every interactive component remains below 150 lines and reuses `Card`,
`Section`, `Button`, `EmptyState`, shared fields, `TaskEditor`,
`TaskHierarchy`, and existing Task collections.

## Item-backed context

No database schema change is required. Atlas already persists a recursive Item
tree and supports `Workflow` and `Reference` Item types. Project context uses
explicit, namespaced Item conventions:

| Concept | Item representation | Why |
| --- | --- | --- |
| Milestone | `Workflow` child with `atlas:project-milestone` | A meaningful checkpoint can contain an ordered Task group and use normal status/date fields. |
| Project note | `Reference` child with `atlas:project-note` | Lightweight Project memory remains Item data rather than a document subsystem. |
| Pinned note | Note with `atlas:pinned` | Pinning is explicit without another persistence model. |
| Related Project edge | Symmetric `Reference` children with target tags | Both dashboards show the relationship while Projects remain independent roots. |

Runtime refinements ensure ordinary Workflow and Reference Items are never
mistaken for dashboard artifacts. These Items remain invisible to focus and
Task planning because only valid Tasks are actionable.

## Data and command flow

```text
Project UI
  -> ProjectFeature
  -> HTTP feature adapter
  -> POST /api/atlas
  -> ProjectService
  -> pure Project artifact / Task-tree operations
  -> ItemRepository
  -> Prisma -> PostgreSQL
```

The UI owns form disclosure, confirmation, and announcements. `ProjectService`
validates Project identity and coordinates snapshot commands. Pure domain
functions create/refine artifacts, build groups and dashboard projections, and
immutably change the tree.

## Behavior decisions

### Progress

When Milestones exist, completed Milestones form the progress denominator and
the dashboard says “N of N.” Without Milestones, Atlas labels the value **Task
completion evidence** rather than implying that Task completion proves the
outcome. Remaining time and effort are derived from open Tasks.

### Task grouping and ordering

Each Milestone is a shallow Task group. A root Task can move between a
Milestone and ungrouped work through a labelled native select. The same Task
identity and Project membership remain intact. Existing ordering commands work
inside each group. Removing a Milestone promotes its Tasks to ungrouped work;
it never deletes those Tasks.

Rapid entry continues through the replaceable manual breakdown service. One
Task per line is created in the supplied order. Detailed creation and editing
continue through the shared canonical `TaskEditor`.

### Notes

Notes are plain text with creation/update evidence. Pinned notes sort before
unpinned notes, then by recent activity. Pin, unpin, and delete are explicit
commands. Notes do not become rich documents, comments, or fake activity.

### Related Projects

Relationships are symmetric: linking A to B makes each visible from the other.
Self-links and duplicate links are rejected or ignored. Unlinking removes both
edges but never changes either Project.

### Timeline

Timeline combines scheduled Tasks, Task due dates, best-available Task
completion dates, Milestone targets, and Milestone achievements. Each entry is
verbally distinguished. It remains a Project chronology, not a calendar.

## AI boundary

The AI Project Assistant is an informational placeholder with no button,
provider, prompt, network request, or mutation path. A future assistant can
consume Project evidence and return proposals, but accepted changes must use
the same explicit Project and Task feature commands. AI must never silently
write Project data.

## Accessibility and responsive behavior

- The semantic order is unchanged across screen sizes.
- Native forms and buttons provide full keyboard and touch access.
- Task grouping has a descriptive accessible label.
- Milestone, pin, Waiting, and Blocked states use text as well as color.
- Deletes require a second confirmation and Milestone deletion preserves its
  Tasks.
- All command results use the existing polite live region.
- Two-column supporting regions collapse to one column on mobile.

## Tradeoffs

- Project context shares the Item snapshot repository, preserving the current
  architecture but retaining its whole-aggregate concurrency limits.
- Notes currently support create, pin, and delete, not rich editing or version
  history.
- Related-project edges have no dependency semantics; they communicate context
  only.
- Task completion time still uses `updatedAt` because Atlas has no event log or
  dedicated `completedAt` field.
