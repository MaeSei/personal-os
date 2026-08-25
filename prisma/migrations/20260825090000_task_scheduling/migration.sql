CREATE TYPE "preferred_time" AS ENUM (
    'Anytime',
    'Morning',
    'Afternoon',
    'Evening'
);

ALTER TABLE "items"
    ADD COLUMN "scheduled_start" TIMESTAMPTZ(3),
    ADD COLUMN "scheduled_end" TIMESTAMPTZ(3),
    ADD COLUMN "estimated_duration" INTEGER,
    ADD COLUMN "preferred_time" "preferred_time",
    ADD COLUMN "preferred_context" TEXT;

-- Preserve the earlier optional planning metadata as compatibility input.
UPDATE "items"
SET
    "estimated_duration" = "duration_minutes",
    "preferred_context" = "context"
WHERE "type" = 'Task';

ALTER TABLE "items"
    ADD CONSTRAINT "items_scheduled_range_check" CHECK (
        ("scheduled_start" IS NULL AND "scheduled_end" IS NULL) OR
        (
            "scheduled_start" IS NOT NULL AND
            "scheduled_end" IS NOT NULL AND
            "scheduled_end" > "scheduled_start"
        )
    ),
    ADD CONSTRAINT "items_estimated_duration_check" CHECK (
        "estimated_duration" IS NULL OR "estimated_duration" > 0
    );

CREATE INDEX "items_scheduled_start_idx" ON "items"("scheduled_start");
