# Planner UX decisions

This pass keeps the Planner's product boundary unchanged: it helps the user
choose and shape the day. It does not manage Projects, process Inbox Items,
write Calendar events, or schedule work automatically.

## Information hierarchy

- The large greeting remains the orientation point, while the three inventory
  counts now share one compact surface. Counts are context, not the primary
  content, so they use heading typography instead of oversized metric type.
- The main decision region is named **Today's Plan**. Deterministic suggestions
  and the chosen order are visibly separate; suggested never means accepted.
- Projects, Tasks, and Inbox remain in the context rail. Desktop gains width,
  while mobile keeps the same document order: plan first, context second.
- Time Block cards show only time, duration, type/lock state, title, and link
  counts initially. Editing, timing operations, and linked work use progressive
  disclosure so one block does not expose a wall of controls.

## Interaction decisions

| Interaction | Decision |
| --- | --- |
| Add one Task | A labeled **Add to today** button remains the primary reliable action. Focus moves to the chosen-order region after success. |
| Add several Tasks | Native checkboxes and one atomic **Add selected** command remain. Selection clears only after a successful save. |
| Drag a Task | Cards use native drag data and drop targets visibly change border, surface, and elevation while active. A drop never assigns a time implicitly. |
| Reorder chosen Tasks | Drop-before behavior remains, with Move up/down buttons and `Alt+ArrowUp` / `Alt+ArrowDown` keyboard shortcuts. |
| Return a Task | The Task returns to the pool through one command; focus moves to the plan region rather than disappearing with the removed card. |
| Search | `/` focuses search when the user is not editing another field. `Escape` and a visible Clear button reset it. Search never filters the accepted plan. |
| Collapse a panel | Buttons now announce the relevant panel name, avoiding repeated ambiguous “Expand” controls. Disclosure remains local UI state. |
| Create a Time Block | The explicit button and Task drop target open the same form. The name field receives focus and a dropped/linked Task supplies the initial title. |
| Edit a Time Block | Details save independently. Timing actions and work links remain behind their own disclosures. |
| Move, resize, split, duplicate | Exact time inputs remain the keyboard, touch, and precision path. Locked blocks disable timing inputs that cannot succeed. |
| Link or unlink work | Native selects and labeled buttons remain. After unlink removes the focused row, focus returns to the Linked work summary. |
| Merge blocks | Only compatible adjacent blocks expose Merge. Focus returns to the surviving block after success. |
| Delete a block | Delete now requires an inline confirmation and explains that linked Tasks are preserved. Focus returns to the Time Blocks section after success. |
| Save or Start Day | The existing draft/publication boundary remains explicit. All planning controls disable during a write and a nearby live status reports progress and completion. |

## Drag and touch behavior

Native drag remains an enhancement, not a requirement. Task identity uses an
Atlas-specific data type with `text/plain` fallback. Drop targets set the move
effect and expose a calm active state; dragged cards reduce opacity so origin
and destination stay clear.

Touch users use the same labeled Add, Move, Schedule, and timing controls. Atlas
does not add pointer-only resize handles because exact time inputs are more
reliable on small screens and with assistive technology.

## Keyboard and accessibility

- All mutations remain native buttons, forms, checkboxes, selects, or time
  inputs; drag is never the only path.
- Search declares `/` and `Escape` shortcuts. Reorder buttons declare their
  Alt+Arrow shortcuts and still work without shortcuts.
- Repeated disclosure controls include the associated panel or Time Block name.
- Drop zones are labeled groups and become programmatic focus targets after
  successful mutations.
- Saving and completion feedback uses a polite, atomic live region. Errors
  remain assertive and visible above the workspace.
- Destructive confirmation is inline, keyboard reachable, and initially focuses
  the final confirmation button.
- Existing global focus rings and reduced-motion behavior remain authoritative.

## Motion

Motion communicates state only. Drop targets transition color, border, and
elevation; dragged cards transition opacity; loading feedback uses a restrained
pulse. All new motion respects `prefers-reduced-motion`.

Panel disclosure remains immediate because hidden content must also leave the
keyboard and accessibility trees. Atlas avoids a decorative height animation
that could leave collapsed controls focusable.

## Loading, errors, and empty states

- Initial load retains the full-page status with a restrained loading pulse.
- Mutations keep the current plan visible, set the workspace busy, disable
  conflicting controls, and show **Saving changes…** beside the content.
- Success messages describe the completed command; service errors preserve the
  current workspace and remain retryable from the original control.
- Project and Task empty states now distinguish an empty inventory from a search
  with no matches. Inbox follows the same distinction.
- An empty suggestion set is explained without inventing work. The chosen-order
  and Time Block empty states retain direct, encouraging next steps.

## Intentional limits

- Native HTML drag is kept because adding a drag library would increase bundle
  size and duplicate accessible button behavior.
- Planner search remains local while the complete projection is already loaded.
- Time Blocks remain independent of external Calendar events.
- No animations alter layout, delay a command, or imply that deterministic
  suggestions are AI-generated.
