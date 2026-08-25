ALTER TABLE "day_plan_tasks"
    DROP CONSTRAINT IF EXISTS "day_plan_tasks_focus_checklist_check",
    DROP CONSTRAINT IF EXISTS "day_plan_tasks_focus_notes_check",
    DROP CONSTRAINT IF EXISTS "day_plan_tasks_focus_elapsed_check",
    DROP COLUMN IF EXISTS "focus_checklist",
    DROP COLUMN IF EXISTS "focus_notes",
    DROP COLUMN IF EXISTS "focus_elapsed_seconds",
    DROP COLUMN IF EXISTS "focus_started_at";
