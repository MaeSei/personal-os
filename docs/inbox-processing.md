# Inbox processing

Inbox is Atlas's low-friction capture boundary. Processing turns an untriaged
thought into exactly one durable meaning without asking the user to plan more
than necessary.

Capture is available globally through the persistent desktop entry or mobile
floating action button. It asks only for a title and immediately creates an
Inbox Idea; Area, Project, dates, duration, energy, and context remain deferred
to this processing flow. See `docs/universal-capture.md` for its complete
interaction contract.

## Processing flow

The screen presents the first Inbox position in the current aggregate one Item
at a time. The current implementation preserves repository order, which means
newly captured Items appear first because capture prepends them.

The first screen asks only what the thought should become:

- Task
- Project
- Someday
- Reference
- Delete

Task and Project reveal their required fields only after selection. Optional
Task planning fields and Project description use native disclosure controls.
Someday and Reference complete immediately. Delete requires confirmation.

After every successful decision, Atlas reloads the aggregate and presents the
next Inbox Item. The count is derived from `Status.Inbox`; it is not stored
separately.

## Outcome rules

### Task

- Area is required and must exist in the configured Area repository.
- Project is optional. A selected Project must exist and belong to that Area.
- The captured title, ID, creation time, attention score, effort, and tags are
  preserved.
- Status becomes `Today`, making the Task eligible for next-action and focus
  planning.
- Omitted energy retains the neutral captured energy value.
- Duration is a positive number of minutes.
- Context is optional free text.
- Due and scheduled dates are optional `YYYY-MM-DD` calendar days.
- A Project assignment populates both canonical `projectId` and compatibility
  `parentId`.

### Project

- Area, title, and desired outcome are required.
- Description is independent and optional.
- Status becomes `Active`.
- The captured ID and creation time are preserved.
- No Task is created implicitly.
- After creation, the UI explicitly offers `Add first Task` or `Do this later`.
- A first Task inherits the Project Area and becomes its `Today` child.

### Someday

Someday changes only status and activity time. The Item remains an Idea because
the user has decided when to reconsider it, not what kind of information it is.

### Reference

Reference changes the type to `Reference` and status to `Active`. It remains
non-actionable and Area-less; the current Reference domain has no organization
screen or Area requirement.

### Delete

Delete removes the Item from the aggregate after confirmation. Atlas has no
recovery or trash facility, so the UI labels deletion as irreversible.

## Identity and duplicate prevention

Task and Project processing convert the captured Item under its existing ID.
`InboxService` replaces the top-level Inbox entry in a single complete-
aggregate save. It never appends the processed form. If duplicate top-level
copies with that ID exist in legacy data, replacement retains only one.

New capture and first-Task IDs are checked recursively against the loaded Item
tree. A generated collision is retried, then rejected rather than overwritten.

## Application and persistence boundary

```text
Inbox UI
  -> useInbox
     -> InboxFeature HTTP adapter
        -> InboxService
           -> ItemRepository + AreaRepository
           -> Inbox triage domain functions
           -> PrismaItemRepository
              -> PostgreSQL
```

The UI never imports a repository or accesses PostgreSQL. Domain conversion is
pure. The application service validates cross-aggregate relationships and owns
the read-modify-write use case. The repository owns database mapping and its
transaction.

## Keyboard and mobile behavior

- `C` focuses Universal Capture while focus is outside an editable control.
- The desktop capture field submits with `Enter`; the mobile button opens a
  focused title field in one tap.
- Native buttons, selects, inputs, details, and forms support Tab, Shift+Tab,
  Enter, Space, and browser validation.
- T, P, S, R, and Delete activate the five decisions while focus is outside a
  form control.
- Escape returns Task and Project forms to the choice screen.
- Newly disclosed required controls receive focus.
- Processing results are announced through the existing polite live region.
- Controls stack on mobile and use a two-column choice grid when space allows.

## Mission Control effects

The next Mission Control load reads the same Item aggregate:

- Inbox count decreases because the processed Item no longer has Inbox status.
- A standalone or Project Task can enter focus planning as concrete Today work.
- A Project is grouped under its Area and can remain valid with no Task.
- Someday Ideas and References remain outside focus planning.
- Deleted Items no longer appear in any derived view.
