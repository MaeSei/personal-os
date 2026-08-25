# Atlas Availability Engine

The Availability Engine calculates the time that is genuinely open for work on
one local calendar date. It is pure TypeScript: it has no provider, repository,
database, React, or Next.js dependency.

## Contract

`AvailabilityService.getAvailableSlots()` receives:

- the local `YYYY-MM-DD` date and IANA time zone;
- one or more working-hour windows expressed as minutes from local midnight;
- local break windows;
- existing Atlas Time Blocks;
- provider-neutral Calendar event occurrences.

It returns ordered slots with exact `Date` boundaries and an elapsed `duration`
in minutes. Exact instants keep the result unambiguous across time zones and
daylight-saving transitions.

## Rules

1. Working windows are merged, so overlapping shifts never duplicate time.
2. Breaks and Atlas Time Blocks are hard constraints.
3. Busy Calendar events are hard constraints unless the connected user
   declined them.
4. Transparent/free events do not consume time.
5. Busy all-day events use their provider-normalized local-midnight boundaries
   and therefore remove every working slot they intersect.
6. Constraints from every selected calendar are combined. Overlapping and
   adjacent constraints are merged before subtraction.
7. Recurrence expansion remains a Calendar-provider responsibility. Google is
   requested with `singleEvents: true`, so the engine receives ordinary event
   occurrences and handles them identically to one-off meetings.

Intervals are half-open: `start` is inclusive and `end` is exclusive. Adjacent
events therefore do not create zero-length gaps. Overnight working hours should
be represented as two date-scoped windows because an Availability request owns
exactly one local day.

## Boundary decisions

The engine accepts a small structural Calendar event type rather than a Google
event. This preserves the dependency direction:

```text
Google / ICS / mock provider
  -> normalized Calendar occurrences
  -> AvailabilityService
  -> Available Slots
```

Google's self-attendee response is normalized at the adapter boundary. A
declined event is also marked non-busy before caching, so the read-only cache
retains correct availability semantics without storing provider credentials or
raw event payloads.

`PlannerService` now consumes this result for visible capacity and interactive
Task drop targets. It projects exact instants back into the current Day Plan's
whole-minute boundaries and re-runs the calculation before every direct slot
write. Production currently supplies a 09:00–17:00 local working window and no
breaks; user-owned working-hour and break settings remain a later boundary.
