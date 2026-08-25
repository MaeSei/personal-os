import type {
  CalendarConnection,
  CalendarSyncStatus,
} from "@/calendar";
import type { PrismaClient } from "@/generated/prisma/client";
import type { CalendarRepository } from "@/repositories/CalendarRepository";

type PrismaProvider = () => PrismaClient;

const TO_DOMAIN_STATUS = {
  Error: "error",
  Idle: "idle",
  Success: "success",
  Syncing: "syncing",
} as const satisfies Record<string, CalendarSyncStatus>;

const TO_STORAGE_STATUS = {
  error: "Error",
  idle: "Idle",
  success: "Success",
  syncing: "Syncing",
} as const;

/** PostgreSQL snapshot adapter for one encrypted Calendar connection. */
class PrismaCalendarRepository implements CalendarRepository {
  constructor(private readonly getClient: PrismaProvider) {}

  async delete(): Promise<void> {
    await this.getClient().calendarConnection.deleteMany({
      where: { provider: "google" },
    });
  }

  async get(): Promise<CalendarConnection | null> {
    const row = await this.getClient().calendarConnection.findUnique({
      include: {
        calendars: {
          include: {
            events: { orderBy: [{ start: "asc" }, { id: "asc" }] },
          },
          orderBy: [{ primary: "desc" }, { title: "asc" }, { id: "asc" }],
        },
      },
      where: { provider: "google" },
    });

    if (!row) return null;
    if (row.provider !== "google") {
      throw new Error("Atlas found an unsupported Calendar provider.");
    }

    return {
      calendars: row.calendars.map((calendar) => ({
        accessRole: calendar.accessRole,
        color: calendar.color,
        description: calendar.description,
        events: calendar.events.map((event) => ({
          allDay: event.allDay,
          busy: event.busy,
          calendarId: calendar.externalId,
          description: event.description,
          end: new Date(event.end),
          externalId: event.externalId,
          id: event.id,
          location: event.location,
          recurringEventId: event.recurringEventId,
          start: new Date(event.start),
          synchronizedAt: new Date(event.synchronizedAt),
          timeZone: event.timeZone,
          title: event.title,
        })),
        externalId: calendar.externalId,
        id: calendar.id,
        primary: calendar.primary,
        selected: calendar.selected,
        syncToken: calendar.syncToken,
        timeZone: calendar.timeZone,
        title: calendar.title,
      })),
      connectedAt: new Date(row.connectedAt),
      email: row.email,
      encryptedRefreshToken: row.encryptedRefreshToken,
      id: row.id,
      lastSyncedAt: row.lastSyncedAt ? new Date(row.lastSyncedAt) : null,
      provider: row.provider,
      providerAccountId: row.providerAccountId,
      syncError: row.syncError,
      syncStatus: TO_DOMAIN_STATUS[row.syncStatus],
      updatedAt: new Date(row.updatedAt),
    };
  }

  async save(connection: CalendarConnection): Promise<void> {
    const client = this.getClient();
    await client.$transaction(async (transaction) => {
      await transaction.calendarConnection.upsert({
        create: {
          connectedAt: connection.connectedAt,
          email: connection.email,
          encryptedRefreshToken: connection.encryptedRefreshToken,
          id: connection.id,
          lastSyncedAt: connection.lastSyncedAt,
          provider: connection.provider,
          providerAccountId: connection.providerAccountId,
          syncError: connection.syncError,
          syncStatus: TO_STORAGE_STATUS[connection.syncStatus],
          updatedAt: connection.updatedAt,
        },
        update: {
          email: connection.email,
          encryptedRefreshToken: connection.encryptedRefreshToken,
          lastSyncedAt: connection.lastSyncedAt,
          providerAccountId: connection.providerAccountId,
          syncError: connection.syncError,
          syncStatus: TO_STORAGE_STATUS[connection.syncStatus],
          updatedAt: connection.updatedAt,
        },
        where: { id: connection.id },
      });

      for (const calendar of connection.calendars) {
        await transaction.connectedCalendar.upsert({
          create: {
            accessRole: calendar.accessRole,
            color: calendar.color,
            connectionId: connection.id,
            description: calendar.description,
            externalId: calendar.externalId,
            id: calendar.id,
            primary: calendar.primary,
            selected: calendar.selected,
            syncToken: calendar.syncToken,
            timeZone: calendar.timeZone,
            title: calendar.title,
          },
          update: {
            accessRole: calendar.accessRole,
            color: calendar.color,
            description: calendar.description,
            externalId: calendar.externalId,
            primary: calendar.primary,
            selected: calendar.selected,
            syncToken: calendar.syncToken,
            timeZone: calendar.timeZone,
            title: calendar.title,
          },
          where: { id: calendar.id },
        });
      }

      await transaction.cachedCalendarEvent.deleteMany({
        where: { calendar: { connectionId: connection.id } },
      });
      const events = connection.calendars.flatMap((calendar) =>
        calendar.events.map((event) => ({
          allDay: event.allDay,
          busy: event.busy,
          calendarId: calendar.id,
          description: event.description,
          end: event.end,
          externalId: event.externalId,
          id: event.id,
          location: event.location,
          recurringEventId: event.recurringEventId ?? null,
          start: event.start,
          synchronizedAt: event.synchronizedAt,
          timeZone: event.timeZone ?? null,
          title: event.title,
        })),
      );
      if (events.length > 0) {
        await transaction.cachedCalendarEvent.createMany({ data: events });
      }

      await transaction.connectedCalendar.deleteMany({
        where: {
          connectionId: connection.id,
          ...(connection.calendars.length > 0
            ? { id: { notIn: connection.calendars.map(({ id }) => id) } }
            : {}),
        },
      });
    });
  }
}

export { PrismaCalendarRepository };
