-- Restores the Sprint 7.1 shape. Multiple links and new metadata cannot be
-- represented by that shape, so rollback keeps the first Task link only.
ALTER TABLE "time_blocks"
    ADD COLUMN "task_id" TEXT,
    ADD COLUMN "duration_minutes" INTEGER;

UPDATE "time_blocks" AS "block"
SET
    "duration_minutes" = "block"."end_minute" - "block"."start_minute",
    "task_id" = (
        SELECT "link"."task_id"
        FROM "time_block_tasks" AS "link"
        WHERE "link"."time_block_id" = "block"."id"
        ORDER BY "link"."task_id"
        LIMIT 1
    );

ALTER TABLE "time_blocks"
    ALTER COLUMN "duration_minutes" SET NOT NULL,
    DROP CONSTRAINT "time_blocks_boundary_check",
    ADD CONSTRAINT "time_blocks_start_check" CHECK (
        "start_minute" >= 0 AND "start_minute" < 1440
    ),
    ADD CONSTRAINT "time_blocks_duration_check" CHECK (
        "duration_minutes" > 0 AND "start_minute" + "duration_minutes" <= 1440
    );

DROP TABLE IF EXISTS "time_block_projects";
DROP TABLE IF EXISTS "time_block_tasks";

ALTER TABLE "time_blocks"
    DROP COLUMN "end_minute",
    DROP COLUMN "type",
    DROP COLUMN "locked",
    DROP COLUMN "notes";

CREATE INDEX "time_blocks_task_id_idx" ON "time_blocks"("task_id");
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_task_id_fkey"
    FOREIGN KEY ("task_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TYPE IF EXISTS "time_block_type";
