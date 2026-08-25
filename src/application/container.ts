import "server-only";

import { ApplicationContainer } from "@/application/ApplicationContainer";
import { PrismaRepositoryFactory } from "@/repositories/PrismaRepositoryFactory";
import { MockCalendarProvider } from "@/calendar";

function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** The server-only composition root for production application services. */
const applicationContainer = new ApplicationContainer(
  new PrismaRepositoryFactory(),
  {
    calendarProvider: new MockCalendarProvider(),
    createId,
    missionControlContext: {
      locale: "en-GB",
      timeZone: "Europe/Stockholm",
      userName: "Maike",
    },
  },
);

export { applicationContainer };
