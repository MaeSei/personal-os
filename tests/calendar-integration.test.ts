import assert from "node:assert/strict";
import test from "node:test";

import { CalendarService } from "../src/application/CalendarService";
import {
  MockCalendarProvider,
  type CalendarEvent,
  type CalendarProvider,
  type CalendarRange,
} from "../src/calendar";

const range: CalendarRange = {
  end: new Date("2026-08-25T22:00:00.000Z"),
  start: new Date("2026-08-24T22:00:00.000Z"),
  timeZone: "Europe/Stockholm",
};

function event(
  id: string,
  start: string,
  end: string,
  title = id,
): CalendarEvent {
  return {
    allDay: false,
    busy: true,
    calendarId: "primary",
    description: null,
    end: new Date(end),
    id,
    location: null,
    start: new Date(start),
    title,
  };
}

test("MockCalendarProvider is disconnected and empty by default", async () => {
  const snapshot = await new CalendarService(
    new MockCalendarProvider(),
  ).getEvents(range);

  assert.equal(snapshot.connected, false);
  assert.deepEqual(snapshot.events, []);
});

test("CalendarService clips, validates, de-duplicates, and orders events", async () => {
  const service = new CalendarService(new MockCalendarProvider({
    connected: true,
    events: [
      event("later", "2026-08-25T10:00:00.000Z", "2026-08-25T11:00:00.000Z"),
      event("outside", "2026-08-26T10:00:00.000Z", "2026-08-26T11:00:00.000Z"),
      event("first", "2026-08-25T06:00:00.000Z", "2026-08-25T07:00:00.000Z", " First "),
      event("first", "2026-08-25T06:00:00.000Z", "2026-08-25T07:30:00.000Z", "Updated"),
      event("invalid", "2026-08-25T09:00:00.000Z", "2026-08-25T08:00:00.000Z"),
    ],
  }));

  const snapshot = await service.getEvents(range);

  assert.deepEqual(snapshot.events.map(({ id }) => id), ["first", "later"]);
  assert.equal(snapshot.events[0]?.title, "Updated");
});

test("CalendarService isolates provider failures from the Planner", async () => {
  const failingProvider: CalendarProvider = {
    id: "failing",
    kind: "mock",
    readOnly: true,
    getEvents: () => Promise.reject(new Error("Provider unavailable")),
  };

  const snapshot = await new CalendarService(failingProvider).getEvents(range);

  assert.equal(snapshot.connected, false);
  assert.deepEqual(snapshot.events, []);
  assert.match(snapshot.message, /temporarily unavailable/i);
});
