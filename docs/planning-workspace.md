# Planning Workspace

The `/planner` route is Atlas's responsive Planning Workspace. It replaces the
previous long agenda composition while preserving the existing Day Plan and
Time Block behavior. Interaction-level decisions from the polish pass are
documented in `docs/planner-ux-polish.md`.

## Product question

The workspace answers:

> With my Projects and captured work visible, what am I intentionally choosing
> for today?

It is not a Project manager, Inbox processor, or external Calendar editor.
Those systems remain visible as context and route to their dedicated screens.

## Information hierarchy

```text
Morning orientation
  -> Workspace search
  -> Planner
       -> Attention and available time
       -> Suggested and accepted Tasks
       -> Time Blocks
  -> Calendar context
  -> Projects
  -> Available Tasks
  -> Inbox
  -> Quick Capture
```

The Planner is first in document order, so mobile and assistive technology reach
the primary decision before supporting inventories. At tablet width the screen
becomes a two-column workspace: plan and Calendar on the left, work context on
the right. Desktop keeps the same hierarchy with more room rather than adding a
third navigation layer.

## Interaction model

### Drag and drop

Available Task cards retain native drag behavior. A Task can be dropped into
today's accepted order or onto the Time Block creation target. Dropping onto a
Time Block target only prepares the form; exact timing still requires explicit
confirmation.

Every drag action has a labeled button alternative. Touch and keyboard users do
not need precise drag gestures.

### Resize and edit

Time Block summaries show time, duration, type, lock state, and linked-context
counts. Move, resize, split, duplicate, linking, and destructive controls are
collapsed by default. Expanding one block reveals the existing explicit clock
controls. This keeps the overview calm and preserves keyboard precision.

### Collapse and expand

Planner, Calendar, Projects, Tasks, and Inbox are accessible disclosure panels.
Their controls use native buttons with `aria-expanded` and an associated content
region. Disclosure state is local presentation state and is not persisted.

### Search

Search filters the Project, available Task, and Inbox context projections. It
does not hide today's accepted plan or Calendar evidence, because changing the
visible decision record in response to a search would be disorienting. Search
does not call repositories or modify work.

### Multi-select

Checkboxes select available Tasks. **Add selected** calls
`PlannerFeature.placeTasks(ids)` once. `PlannerService` validates every identity,
removes duplicates, preserves selection order, and persists one Day Plan update.
Projects and Inbox Items are deliberately not selectable into Today: Projects
are outcomes, and Inbox Items require triage before they become actionable.

## Data flow

```text
PlanningWorkspace UI state
  -> PlannerFeature
  -> HTTP feature adapter
  -> PlannerService
  -> Item / DayPlan / Review repositories + CalendarProvider
  -> refreshed DailyPlannerData
```

`DailyPlannerData` now includes read-only Inbox summaries as well as Projects,
available Tasks, commitments, Time Blocks, Calendar evidence, and capacity.
Business eligibility and ordering remain in `PlannerService`; only text matching,
selection, and disclosure live in React.

## Responsive behavior

- Mobile: one reading column, Planner first, large touch controls, explicit
  scheduling and resize forms.
- Tablet: plan/context two-column grid with panels independently collapsible.
- Desktop: the same two-zone model at the 1200px Atlas content boundary, with
  generous spacing and no permanent inspector or sidebar navigation.

## Accessibility

- Search has a visible label and polite result-count announcements.
- Multi-select uses native labeled checkboxes.
- Disclosure uses buttons, `aria-expanded`, and controlled regions.
- Dragging is optional; all mutations have button/form equivalents.
- Existing focus rings, contrast tokens, semantic headings, status regions, and
  reduced-motion behavior remain active.

## Tradeoffs

- Search is intentionally local because the complete Planner projection is
  already loaded. Server search becomes useful only when data volume requires
  pagination.
- Multi-select supports the one unambiguous bulk decision: add available Tasks
  to today. Atlas does not infer bulk scheduling times.
- Calendar events remain read-only context and do not yet reduce available-time
  arithmetic.
- Inbox is visible but cannot bypass triage, preventing uncategorized thoughts
  from silently becoming Tasks.
- Resize uses explicit time inputs rather than pointer-only handles. This is
  reliable on desktop, tablet, mobile, and keyboards; a future direct-manipulation
  timeline can enhance the same service commands.
