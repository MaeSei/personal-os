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
