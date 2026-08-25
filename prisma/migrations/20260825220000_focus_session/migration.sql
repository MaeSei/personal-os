ALTER TABLE "day_plan_tasks"
    ADD COLUMN "focus_started_at" TIMESTAMPTZ(3),
    ADD COLUMN "focus_elapsed_seconds" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "focus_notes" TEXT,
    ADD COLUMN "focus_checklist" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "day_plan_tasks"
    ADD CONSTRAINT "day_plan_tasks_focus_elapsed_check" CHECK (
        "focus_elapsed_seconds" >= 0
    ),
    ADD CONSTRAINT "day_plan_tasks_focus_notes_check" CHECK (
        "focus_notes" IS NULL OR length("focus_notes") <= 10000
    ),
    ADD CONSTRAINT "day_plan_tasks_focus_checklist_check" CHECK (
        jsonb_typeof("focus_checklist") = 'array'
    );
