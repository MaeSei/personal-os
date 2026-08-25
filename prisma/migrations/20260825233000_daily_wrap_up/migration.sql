CREATE TYPE "plan_assessment" AS ENUM ('AsPlanned', 'Partly', 'Differently');
CREATE TYPE "estimate_assessment" AS ENUM ('Accurate', 'Mixed', 'Inaccurate', 'NotEnoughData');

CREATE TABLE "daily_wrap_ups" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "plan_assessment" "plan_assessment" NOT NULL,
    "estimate_assessment" "estimate_assessment" NOT NULL,
    "notes" TEXT,
    "planned_task_count" INTEGER NOT NULL,
    "completed_task_count" INTEGER NOT NULL,
    "incomplete_task_count" INTEGER NOT NULL,
    "planned_time_block_count" INTEGER NOT NULL,
    "planned_minutes" INTEGER NOT NULL,
    "actual_focus_seconds" INTEGER NOT NULL,
    "calendar_event_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "daily_wrap_ups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "daily_wrap_ups_counts_check" CHECK (
        "planned_task_count" >= 0 AND
        "completed_task_count" >= 0 AND
        "incomplete_task_count" >= 0 AND
        "planned_time_block_count" >= 0 AND
        "planned_minutes" >= 0 AND
        "actual_focus_seconds" >= 0 AND
        "calendar_event_count" >= 0 AND
        "completed_task_count" + "incomplete_task_count" = "planned_task_count"
    ),
    CONSTRAINT "daily_wrap_ups_notes_check" CHECK (
        "notes" IS NULL OR length("notes") <= 2000
    )
);

CREATE TABLE "daily_wrap_up_tasks" (
    "wrap_up_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "carried_forward" BOOLEAN NOT NULL,
    "estimated_duration_minutes" INTEGER,
    "actual_duration_seconds" INTEGER,
    CONSTRAINT "daily_wrap_up_tasks_pkey" PRIMARY KEY ("wrap_up_id", "task_id"),
    CONSTRAINT "daily_wrap_up_tasks_duration_check" CHECK (
        ("estimated_duration_minutes" IS NULL OR "estimated_duration_minutes" > 0) AND
        ("actual_duration_seconds" IS NULL OR "actual_duration_seconds" >= 0)
    ),
    CONSTRAINT "daily_wrap_up_tasks_wrap_up_id_fkey" FOREIGN KEY ("wrap_up_id")
        REFERENCES "daily_wrap_ups"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "daily_wrap_ups_date_key" ON "daily_wrap_ups"("date");
CREATE INDEX "daily_wrap_ups_date_idx" ON "daily_wrap_ups"("date" DESC);
