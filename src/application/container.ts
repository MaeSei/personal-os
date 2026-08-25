import "server-only";

import { ApplicationContainer } from "@/application/ApplicationContainer";
import { PrismaRepositoryFactory } from "@/repositories/PrismaRepositoryFactory";
import { createGoogleCalendarIntegration } from "@/server/config/googleCalendarConfig";

function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** The server-only composition root for production application services. */
const googleCalendar = createGoogleCalendarIntegration();
const applicationContainer = new ApplicationContainer(
  new PrismaRepositoryFactory(),
  {
    calendarProvider: googleCalendar.provider,
    calendarTokenCipher: googleCalendar.cipher,
    createId,
    missionControlContext: {
      locale: "en-GB",
      timeZone: "Europe/Stockholm",
      userName: "Maike",
    },
  },
);

export { applicationContainer };
