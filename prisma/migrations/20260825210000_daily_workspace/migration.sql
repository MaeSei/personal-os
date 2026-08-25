ALTER TABLE "day_plan_tasks"
    ADD COLUMN "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "is_focused" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "group_title" TEXT;

ALTER TABLE "day_plan_tasks"
    ADD CONSTRAINT "day_plan_tasks_group_title_check" CHECK (
        "group_title" IS NULL OR (
            length(btrim("group_title")) > 0 AND
            length("group_title") <= 60
        )
    );

CREATE UNIQUE INDEX "day_plan_tasks_one_focus_idx"
    ON "day_plan_tasks"("day_plan_id")
    WHERE "is_focused" = true;
