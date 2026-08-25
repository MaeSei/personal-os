DROP INDEX IF EXISTS "day_plan_tasks_one_focus_idx";

ALTER TABLE "day_plan_tasks"
    DROP CONSTRAINT IF EXISTS "day_plan_tasks_group_title_check",
    DROP COLUMN IF EXISTS "group_title",
    DROP COLUMN IF EXISTS "is_focused",
    DROP COLUMN IF EXISTS "is_pinned";
