import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationDirectory = path.join(
  process.cwd(),
  "prisma/migrations/20260824000000_initial_postgresql",
);

test("the initial migration creates empty Atlas persistence", () => {
  const sql = readFileSync(path.join(migrationDirectory, "migration.sql"), "utf8");

  for (const table of ["areas", "items", "daily_reviews"]) {
    assert.match(sql, new RegExp(`CREATE TABLE "${table}"`));
  }

  assert.match(sql, /daily_reviews_latest_idx/);
  assert.match(sql, /items_area_id_fkey/);
  assert.doesNotMatch(sql, /\bINSERT\s+INTO\b/i);
  assert.doesNotMatch(sql, /UNIQUE\s*\(\s*"date"\s*\)/i);
});

test("the disposable rollback removes every initial database object", () => {
  const sql = readFileSync(path.join(migrationDirectory, "down.sql"), "utf8");

  for (const table of ["daily_reviews", "items", "areas"]) {
    assert.match(sql, new RegExp(`DROP TABLE IF EXISTS "${table}"`));
  }

  for (const type of ["item_status", "item_type", "area_color"]) {
    assert.match(sql, new RegExp(`DROP TYPE IF EXISTS "${type}"`));
  }
});

test("the Daily Planner migration stores plans without fake Calendar events", () => {
  const directory = path.join(
    process.cwd(),
    "prisma/migrations/20260824150000_daily_planner",
  );
  const migration = readFileSync(path.join(directory, "migration.sql"), "utf8");
  const rollback = readFileSync(path.join(directory, "down.sql"), "utf8");

  for (const table of ["day_plans", "day_plan_tasks", "time_blocks"]) {
    assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
    assert.match(rollback, new RegExp(`DROP TABLE IF EXISTS "${table}"`));
  }
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
  assert.doesNotMatch(migration, /calendar_events/i);
});

test("the Time Blocking migration preserves existing boundaries and links", () => {
  const directory = path.join(
    process.cwd(),
    "prisma/migrations/20260824180000_time_blocking_engine",
  );
  const migration = readFileSync(path.join(directory, "migration.sql"), "utf8");
  const rollback = readFileSync(path.join(directory, "down.sql"), "utf8");

  assert.match(migration, /CREATE TYPE "time_block_type"/);
  assert.match(migration, /"end_minute" = "start_minute" \+ "duration_minutes"/);
  assert.match(migration, /INSERT INTO "time_block_tasks"/);
  assert.match(migration, /CREATE TABLE "time_block_projects"/);
  assert.match(migration, /"locked" BOOLEAN NOT NULL DEFAULT false/);
  assert.doesNotMatch(migration, /calendar_events/i);

  for (const table of ["time_block_projects", "time_block_tasks"]) {
    assert.match(rollback, new RegExp(`DROP TABLE IF EXISTS "${table}"`));
  }
  assert.match(rollback, /DROP TYPE IF EXISTS "time_block_type"/);
  assert.match(rollback, /ADD COLUMN "duration_minutes" INTEGER/);
});

test("the Task Scheduling migration preserves earlier planning metadata", () => {
  const directory = path.join(
    process.cwd(),
    "prisma/migrations/20260825090000_task_scheduling",
  );
  const migration = readFileSync(path.join(directory, "migration.sql"), "utf8");
  const rollback = readFileSync(path.join(directory, "down.sql"), "utf8");

  assert.match(migration, /CREATE TYPE "preferred_time"/);
  assert.match(migration, /ADD COLUMN "scheduled_start" TIMESTAMPTZ\(3\)/);
  assert.match(migration, /"estimated_duration" = "duration_minutes"/);
  assert.match(migration, /"preferred_context" = "context"/);
  assert.match(migration, /items_scheduled_range_check/);
  assert.doesNotMatch(migration, /recurr/i);
  assert.doesNotMatch(migration, /notification/i);

  assert.match(rollback, /DROP TYPE IF EXISTS "preferred_time"/);
  assert.match(rollback, /DROP COLUMN "scheduled_start"/);
});

test("the Morning Workflow migration preserves accepted plans", () => {
  const directory = path.join(
    process.cwd(),
    "prisma/migrations/20260825140000_morning_workflow",
  );
  const migration = readFileSync(path.join(directory, "migration.sql"), "utf8");
  const rollback = readFileSync(path.join(directory, "down.sql"), "utf8");

  assert.match(migration, /CREATE TYPE "day_plan_status"/);
  assert.match(migration, /ADD COLUMN "status"/);
  assert.match(migration, /UPDATE "day_plans" SET "status" = 'STARTED'/);
  assert.match(rollback, /DROP COLUMN IF EXISTS "status"/);
  assert.match(rollback, /DROP TYPE IF EXISTS "day_plan_status"/);
});

test("the Context Engine migration backfills and can roll back Task contexts", () => {
  const repairName = "20260825185000_item_type_task_compatibility_repair";
  const contextName = "20260825190000_context_engine";
  const repairDirectory = path.join(
    process.cwd(),
    "prisma/migrations",
    repairName,
  );
  const directory = path.join(
    process.cwd(),
    "prisma/migrations",
    contextName,
  );
  const repair = readFileSync(
    path.join(repairDirectory, "migration.sql"),
    "utf8",
  );
  const migration = readFileSync(path.join(directory, "migration.sql"), "utf8");
  const rollback = readFileSync(path.join(directory, "down.sql"), "utf8");

  assert.ok(repairName < contextName);
  assert.match(repair, /^BEGIN;/m);
  assert.match(repair, /CARDINALITY\("contexts"\) > 0/);
  assert.match(repair, /DROP COLUMN "contexts"/);
  assert.match(repair, /RENAME VALUE ''Task'' TO ''TASK''/);
  assert.match(repair, /^COMMIT;/m);
  assert.match(migration, /ADD COLUMN "contexts" TEXT\[\]/);
  assert.match(migration, /"preferred_context"/);
  assert.match(migration, /"context"/);
  assert.match(migration, /WHERE "type" = 'TASK'/);
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
  assert.match(rollback, /"contexts"\[1\]/);
  assert.match(rollback, /DROP COLUMN IF EXISTS "contexts"/);
});

test("Prisma keeps the Task API name while mapping the repaired database label", () => {
  const schema = readFileSync(
    path.join(process.cwd(), "prisma/schema.prisma"),
    "utf8",
  );

  assert.match(schema, /Task\s+@map\("TASK"\)/);
  assert.match(schema, /@@map\("item_type"\)/);
});

test("the Effort Model migration adds confidence without inventing history", () => {
  const directory = path.join(
    process.cwd(),
    "prisma/migrations/20260825200000_effort_model",
  );
  const migration = readFileSync(path.join(directory, "migration.sql"), "utf8");
  const rollback = readFileSync(path.join(directory, "down.sql"), "utf8");

  assert.match(migration, /CREATE TYPE "estimate_confidence"/);
  assert.match(migration, /ADD COLUMN "estimate_confidence"/);
  assert.doesNotMatch(migration, /actual|history|INSERT\s+INTO/i);
  assert.match(rollback, /DROP COLUMN IF EXISTS "estimate_confidence"/);
  assert.match(rollback, /DROP TYPE IF EXISTS "estimate_confidence"/);
});

test("the Daily Workspace migration persists intent without changing Tasks", () => {
  const directory = path.join(
    process.cwd(),
    "prisma/migrations/20260825210000_daily_workspace",
  );
  const migration = readFileSync(path.join(directory, "migration.sql"), "utf8");
  const rollback = readFileSync(path.join(directory, "down.sql"), "utf8");

  assert.match(migration, /ADD COLUMN "is_pinned" BOOLEAN/);
  assert.match(migration, /ADD COLUMN "is_focused" BOOLEAN/);
  assert.match(migration, /ADD COLUMN "group_title" TEXT/);
  assert.match(migration, /day_plan_tasks_one_focus_idx/);
  assert.doesNotMatch(migration, /ALTER TABLE "items"/);
  assert.match(rollback, /DROP COLUMN IF EXISTS "group_title"/);
});

test("the Focus Session migration stores execution context on daily commitments", () => {
  const directory = path.join(
    process.cwd(),
    "prisma/migrations/20260825220000_focus_session",
  );
  const migration = readFileSync(path.join(directory, "migration.sql"), "utf8");
  const rollback = readFileSync(path.join(directory, "down.sql"), "utf8");

  assert.match(migration, /ADD COLUMN "focus_started_at" TIMESTAMPTZ\(3\)/);
  assert.match(migration, /ADD COLUMN "focus_elapsed_seconds" INTEGER/);
  assert.match(migration, /ADD COLUMN "focus_notes" TEXT/);
  assert.match(migration, /ADD COLUMN "focus_checklist" JSONB/);
  assert.doesNotMatch(migration, /ALTER TABLE "items"/);
  assert.doesNotMatch(migration, /pomodoro/i);
  assert.match(rollback, /DROP COLUMN IF EXISTS "focus_checklist"/);
});

test("the Google Calendar migration stores encrypted sync state and indexed cache rows", () => {
  const directory = path.join(
    process.cwd(),
    "prisma/migrations/20260825230000_google_calendar",
  );
  const migration = readFileSync(path.join(directory, "migration.sql"), "utf8");
  const rollback = readFileSync(path.join(directory, "down.sql"), "utf8");

  for (const table of [
    "calendar_connections",
    "connected_calendars",
    "cached_calendar_events",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
    assert.match(rollback, new RegExp(`DROP TABLE IF EXISTS "${table}"`));
  }
  assert.match(migration, /"encrypted_refresh_token" TEXT NOT NULL/);
  assert.doesNotMatch(migration, /"refresh_token" TEXT NOT NULL/);
  assert.match(migration, /connected_calendars_selected_idx/);
  assert.match(migration, /cached_calendar_events_range_idx/);
  assert.match(migration, /ON DELETE CASCADE/);
});

test("the Daily Wrap-Up migration stores evidence without changing Tasks", () => {
  const directory = path.join(
    process.cwd(),
    "prisma/migrations/20260825233000_daily_wrap_up",
  );
  const migration = readFileSync(path.join(directory, "migration.sql"), "utf8");
  const rollback = readFileSync(path.join(directory, "down.sql"), "utf8");

  for (const table of ["daily_wrap_ups", "daily_wrap_up_tasks"]) {
    assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
    assert.match(rollback, new RegExp(`DROP TABLE IF EXISTS "${table}"`));
  }
  assert.match(migration, /"actual_duration_seconds" INTEGER/);
  assert.match(migration, /"carried_forward" BOOLEAN NOT NULL/);
  assert.match(migration, /ON DELETE CASCADE/);
  assert.doesNotMatch(migration, /ALTER TABLE "items"/);
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
});
