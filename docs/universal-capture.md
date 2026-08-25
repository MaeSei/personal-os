# Universal Capture

Universal Capture is Atlas's global, title-only entry into Inbox. Its single
question is: **What do you want to remember?** Planning remains a separate
Inbox-processing step.

## Interaction contract

### Desktop

- A persistent capture field sits at the bottom of every product screen.
- It receives focus when the Atlas shell first becomes available.
- Pressing `C` while focus is outside an editable control returns focus to it.
- `Enter` submits the title. The input clears and remains ready for another
  capture.

### Mobile

- A 56px floating action button stays above the device safe area and uses a
  native button touch target.
- One tap opens the capture panel and moves focus directly into its input.
- The keyboard's done action or the Capture button submits the title.
- Success closes the panel and returns focus to the floating button. Cancel or
  `Escape` does the same without saving.

Both surfaces share one draft and one `CaptureForm`; responsive CSS ensures
only the appropriate surface is interactive. The setup and design-system
routes omit Universal Capture because they are not active workspace screens.

## Save behavior

```text
UniversalCapture
  -> InboxService.capture(title)
     -> ItemRepository.get
     -> createInboxItem
     -> ItemRepository.save
  -> publish same-tab capture event
     -> Inbox and Mission Control reload their service projections
```

Capture asks for no Area, Project, date, duration, context, or energy. The
domain factory trims and validates the title, creates an `Idea` with
`Status.Inbox`, and applies neutral planning values. The PostgreSQL repository
owns persistence behind the application service; capture UI never accesses it.

The user stays on the current route. A visible status notice and live region
confirm the exact title saved. Errors remain on screen without clearing the
draft. A successful save clears the input immediately.

## Same-tab synchronization

Universal Capture publishes a small same-tab UI event only after
`InboxService.capture` succeeds. Mounted Inbox and Mission Control
controllers subscribe and reload through their application services. The
event carries identity for notification purposes; it is not a second data
source and does not perform persistence.

This coordination can later be replaced by router revalidation or a server
mutation response without changing `CaptureForm` or the Inbox domain rule.

## Accessibility decisions

- Inputs have explicit labels, descriptions, native validation, a 200-character
  limit, and `aria-keyshortcuts="C"`.
- Feedback uses `role="status"` for success and `role="alert"` for failure.
- The mobile trigger exposes its expanded state, controlled panel, and dialog
  semantics.
- Opening, closing, successful capture, and `Escape` all move focus
  intentionally.
- The shortcut ignores inputs, textareas, selects, editable content, modifier
  combinations, and repeated keydown events.
- Layout clearance and safe-area tokens keep fixed controls from covering page
  content or mobile browser chrome.
