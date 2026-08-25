DROP INDEX IF EXISTS "items_scheduled_start_idx";

ALTER TABLE "items"
    DROP CONSTRAINT "items_scheduled_range_check",
    DROP CONSTRAINT "items_estimated_duration_check",
    DROP COLUMN "scheduled_start",
    DROP COLUMN "scheduled_end",
    DROP COLUMN "estimated_duration",
    DROP COLUMN "preferred_time",
    DROP COLUMN "preferred_context";

DROP TYPE IF EXISTS "preferred_time";
