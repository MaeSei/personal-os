# Atlas Memory architecture

Sprint 9.9 introduces structured Memory contracts only. It does not add a
database table, repository implementation, extraction model, or raw-text
search.

`MemoryEntry` contains a stable ID, one `MemoryType`, title, concise summary,
optional occurrence time, source IDs, typed links to other Memory entries, and
creation/update timestamps. Supported types are Project, Person, Commitment,
Conversation, Review, and Planning.

`MemoryService` is an application port with `get(query)` and `save(entry)`.
Future persistence will implement this port and enter the composition root in
the same way as current repositories. Until then, the Executive Assistant is
given no Memory implementation and receives an empty structured collection. It
does not compensate by searching Notes, Inbox text, or database rows.

The intended future flow for “I promised Lars I would send pricing” is:

```text
captured text
  -> user-reviewed extraction proposal
  -> Commitment Memory draft
  -> explicit links to Person and Project Memory
  -> user approval
  -> MemoryService.save
```

Email links remain future references. No LLM is connected to Memory in this
sprint, and Memory never becomes an alternate source of canonical Task or
Project state.
