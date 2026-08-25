import assert from "node:assert/strict";
import test from "node:test";

import {
  AvailabilityService,
  CalendarResponseStatus,
  calculateAvailability,
  type AvailabilityCalendarEvent,
  type AvailabilityInput,
} from "../src/domain";

const baseInput: AvailabilityInput = {
  breaks: [],
  calendarEvents: [],
  date: "2026-08-25",
  timeBlocks: [],
  timeZone: "Europe/Stockholm",
  workingHours: [{ end: 17 * 60, start: 9 * 60 }],
};

function event(input: {
  readonly allDay?: boolean;
  readonly busy?: boolean;
  readonly calendarId?: string;
  readonly end: string;
  readonly id: string;
  readonly recurringEventId?: string;
  readonly responseStatus?: CalendarResponseStatus;
  readonly start: string;
}): AvailabilityCalendarEvent {
  return {
    allDay: input.allDay ?? false,
    busy: input.busy ?? true,
    calendarId: input.calendarId ?? "primary",
    end: new Date(input.end),
    id: input.id,
    recurringEventId: input.recurringEventId ?? null,
    responseStatus: input.responseStatus ?? null,
    start: new Date(input.start),
  };
}

function slots(input: AvailabilityInput) {
  return calculateAvailability(input).map((slot) => ({
    duration: slot.duration,
    end: slot.end.toISOString(),
    start: slot.start.toISOString(),
  }));
}

test("calendar events, breaks, and Time Blocks leave deterministic open slots", () => {
  assert.deepEqual(slots({
    ...baseInput,
    breaks: [{ end: 13 * 60, start: 12 * 60 }],
    calendarEvents: [event({
      end: "2026-08-25T11:00:00+02:00",
      id: "meeting",
      start: "2026-08-25T10:00:00+02:00",
    })],
    timeBlocks: [{ end: 16 * 60, start: 15 * 60 }],
  }), [
    { duration: 60, end: "2026-08-25T08:00:00.000Z", start: "2026-08-25T07:00:00.000Z" },
    { duration: 60, end: "2026-08-25T10:00:00.000Z", start: "2026-08-25T09:00:00.000Z" },
    { duration: 120, end: "2026-08-25T13:00:00.000Z", start: "2026-08-25T11:00:00.000Z" },
    { duration: 60, end: "2026-08-25T15:00:00.000Z", start: "2026-08-25T14:00:00.000Z" },
  ]);
});

test("declined and transparent meetings do not consume availability", () => {
  const service = new AvailabilityService();
  const result = service.getAvailableSlots({
    ...baseInput,
    calendarEvents: [
      event({
        end: "2026-08-25T10:00:00+02:00",
        id: "declined",
        responseStatus: CalendarResponseStatus.Declined,
        start: "2026-08-25T09:00:00+02:00",
      }),
      event({
        busy: false,
        end: "2026-08-25T11:00:00+02:00",
        id: "free",
        start: "2026-08-25T10:00:00+02:00",
      }),
    ],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.duration, 8 * 60);
});

test("a busy all-day event blocks every working hour it intersects", () => {
  assert.deepEqual(slots({
    ...baseInput,
    calendarEvents: [event({
      allDay: true,
      end: "2026-08-25T22:00:00.000Z",
      id: "holiday",
      start: "2026-08-24T22:00:00.000Z",
    })],
  }), []);
});

test("overlapping occurrences from multiple calendars are merged once", () => {
  assert.deepEqual(slots({
    ...baseInput,
    calendarEvents: [
      event({
        calendarId: "work",
        end: "2026-08-25T11:00:00+02:00",
        id: "standup-1",
        recurringEventId: "standup",
        start: "2026-08-25T09:30:00+02:00",
      }),
      event({
        calendarId: "personal",
        end: "2026-08-25T12:00:00+02:00",
        id: "appointment",
        start: "2026-08-25T10:30:00+02:00",
      }),
      event({
        calendarId: "work",
        end: "2026-08-25T15:00:00+02:00",
        id: "standup-2",
        recurringEventId: "standup",
        start: "2026-08-25T14:00:00+02:00",
      }),
    ],
  }), [
    { duration: 30, end: "2026-08-25T07:30:00.000Z", start: "2026-08-25T07:00:00.000Z" },
    { duration: 120, end: "2026-08-25T12:00:00.000Z", start: "2026-08-25T10:00:00.000Z" },
    { duration: 120, end: "2026-08-25T15:00:00.000Z", start: "2026-08-25T13:00:00.000Z" },
  ]);
});

test("overlapping working windows do not duplicate availability", () => {
  const result = calculateAvailability({
    ...baseInput,
    workingHours: [
      { end: 13 * 60, start: 9 * 60 },
      { end: 17 * 60, start: 12 * 60 },
    ],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.duration, 8 * 60);
});

test("slot duration measures real elapsed time across daylight saving", () => {
  const result = calculateAvailability({
    ...baseInput,
    date: "2026-03-29",
    workingHours: [{ end: 4 * 60, start: 60 }],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.start.toISOString(), "2026-03-29T00:00:00.000Z");
  assert.equal(result[0]?.end.toISOString(), "2026-03-29T02:00:00.000Z");
  assert.equal(result[0]?.duration, 120);
});

test("availability rejects malformed boundaries before calculation", () => {
  assert.throws(
    () => calculateAvailability({
      ...baseInput,
      workingHours: [{ end: 9 * 60, start: 17 * 60 }],
    }),
    /Working hours must use ordered whole minutes/,
  );
  assert.throws(
    () => calculateAvailability({ ...baseInput, timeZone: "Not/AZone" }),
    /valid IANA time zone/,
  );
});
