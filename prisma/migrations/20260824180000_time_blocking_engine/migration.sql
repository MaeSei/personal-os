-- Add the supported reservation categories.
CREATE TYPE "time_block_type" AS ENUM (
    'Focus',
    'Meeting',
    'Break',
    'Travel',
    'Admin',
    'Personal',
    'Flexible'
);

-- Evolve existing blocks without losing their time boundary or Task link.
ALTER TABLE "time_blocks"
    ADD COLUMN "end_minute" INTEGER,
    ADD COLUMN "type" "time_block_type" NOT NULL DEFAULT 'Focus',
    ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "notes" TEXT;

UPDATE "time_blocks"
SET "end_minute" = "start_minute" + "duration_minutes";

ALTER TABLE "time_blocks"
    ALTER COLUMN "end_minute" SET NOT NULL,
    DROP CONSTRAINT "time_blocks_start_check",
    DROP CONSTRAINT "time_blocks_duration_check",
    ADD CONSTRAINT "time_blocks_boundary_check" CHECK (
        "start_minute" >= 0 AND
        "start_minute" < 1440 AND
        "end_minute" > "start_minute" AND
        "end_minute" <= 1440
    );

CREATE TABLE "time_block_tasks" (
    "time_block_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,

    CONSTRAINT "time_block_tasks_pkey" PRIMARY KEY ("time_block_id", "task_id")
);

CREATE TABLE "time_block_projects" (
    "time_block_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,

    CONSTRAINT "time_block_projects_pkey" PRIMARY KEY ("time_block_id", "project_id")
);

INSERT INTO "time_block_tasks" ("time_block_id", "task_id")
SELECT "id", "task_id"
FROM "time_blocks"
WHERE "task_id" IS NOT NULL;

CREATE INDEX "time_block_tasks_task_id_idx" ON "time_block_tasks"("task_id");
CREATE INDEX "time_block_projects_project_id_idx" ON "time_block_projects"("project_id");

ALTER TABLE "time_block_tasks" ADD CONSTRAINT "time_block_tasks_time_block_id_fkey"
    FOREIGN KEY ("time_block_id") REFERENCES "time_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_block_tasks" ADD CONSTRAINT "time_block_tasks_task_id_fkey"
    FOREIGN KEY ("task_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_block_projects" ADD CONSTRAINT "time_block_projects_time_block_id_fkey"
    FOREIGN KEY ("time_block_id") REFERENCES "time_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_block_projects" ADD CONSTRAINT "time_block_projects_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_blocks" DROP CONSTRAINT "time_blocks_task_id_fkey";
DROP INDEX "time_blocks_task_id_idx";
ALTER TABLE "time_blocks"
    DROP COLUMN "task_id",
    DROP COLUMN "duration_minutes";
