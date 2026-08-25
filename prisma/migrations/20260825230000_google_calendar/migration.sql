CREATE TYPE "calendar_sync_status" AS ENUM ('IDLE', 'SYNCING', 'SUCCESS', 'ERROR');

CREATE TABLE "calendar_connections" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "encrypted_refresh_token" TEXT NOT NULL,
    "connected_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "last_synced_at" TIMESTAMPTZ(3),
    "sync_status" "calendar_sync_status" NOT NULL DEFAULT 'IDLE',
    "sync_error" TEXT,
    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connected_calendars" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "time_zone" TEXT,
    "access_role" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "sync_token" TEXT,
    CONSTRAINT "connected_calendars_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cached_calendar_events" (
    "id" TEXT NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "start" TIMESTAMPTZ(3) NOT NULL,
    "end" TIMESTAMPTZ(3) NOT NULL,
    "all_day" BOOLEAN NOT NULL,
    "busy" BOOLEAN NOT NULL,
    "recurring_event_id" TEXT,
    "time_zone" TEXT,
    "synchronized_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "cached_calendar_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cached_calendar_events_valid_range_check" CHECK ("end" > "start")
);

CREATE UNIQUE INDEX "calendar_connections_provider_key" ON "calendar_connections"("provider");
CREATE UNIQUE INDEX "calendar_connections_provider_account_key" ON "calendar_connections"("provider", "provider_account_id");
CREATE UNIQUE INDEX "connected_calendars_connection_external_key" ON "connected_calendars"("connection_id", "external_id");
CREATE INDEX "connected_calendars_selected_idx" ON "connected_calendars"("connection_id", "selected");
CREATE UNIQUE INDEX "cached_calendar_events_calendar_external_key" ON "cached_calendar_events"("calendar_id", "external_id");
CREATE INDEX "cached_calendar_events_range_idx" ON "cached_calendar_events"("calendar_id", "start", "end");

ALTER TABLE "connected_calendars"
  ADD CONSTRAINT "connected_calendars_connection_id_fkey"
  FOREIGN KEY ("connection_id") REFERENCES "calendar_connections"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cached_calendar_events"
  ADD CONSTRAINT "cached_calendar_events_calendar_id_fkey"
  FOREIGN KEY ("calendar_id") REFERENCES "connected_calendars"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
