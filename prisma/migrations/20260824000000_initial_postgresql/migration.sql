-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "area_color" AS ENUM ('amber', 'green', 'neutral');

-- CreateEnum
CREATE TYPE "item_type" AS ENUM ('Task', 'Project', 'Workflow', 'Reference', 'Idea', 'Reminder', 'Review');

-- CreateEnum
CREATE TYPE "item_status" AS ENUM ('Active', 'Inbox', 'Today', 'Waiting', 'Blocked', 'Someday', 'Completed', 'Archived');

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" "area_color" NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "areas_required_text_check" CHECK (
        length(btrim("id")) > 0 AND
        length(btrim("title")) > 0 AND
        length(btrim("icon")) > 0 AND
        length(btrim("description")) > 0
    ),
    CONSTRAINT "areas_position_check" CHECK ("position" >= 0)
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "item_type" NOT NULL,
    "status" "item_status" NOT NULL,
    "area_id" TEXT,
    "attention_score" INTEGER NOT NULL,
    "energy_cost" INTEGER NOT NULL,
    "effort" INTEGER NOT NULL,
    "context" TEXT,
    "duration_minutes" INTEGER,
    "due_date" DATE,
    "scheduled_date" DATE,
    "parent_id" TEXT,
    "project_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "outcome" TEXT,
    "energy_level" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "items_required_text_check" CHECK (
        length(btrim("id")) > 0 AND length(btrim("title")) > 0
    ),
    CONSTRAINT "items_attention_score_check" CHECK ("attention_score" BETWEEN 0 AND 100),
    CONSTRAINT "items_energy_cost_check" CHECK ("energy_cost" BETWEEN 1 AND 5),
    CONSTRAINT "items_effort_check" CHECK ("effort" BETWEEN 1 AND 5),
    CONSTRAINT "items_duration_check" CHECK ("duration_minutes" IS NULL OR "duration_minutes" > 0),
    CONSTRAINT "items_sort_order_check" CHECK ("sort_order" >= 0),
    CONSTRAINT "items_self_parent_check" CHECK ("parent_id" IS NULL OR "parent_id" <> "id"),
    CONSTRAINT "items_self_project_check" CHECK ("project_id" IS NULL OR "project_id" <> "id"),
    CONSTRAINT "items_area_required_check" CHECK (
        "type" NOT IN ('Task', 'Project') OR "area_id" IS NOT NULL
    ),
    CONSTRAINT "items_project_shape_check" CHECK (
        ("type" = 'Project' AND "outcome" IS NOT NULL AND length(btrim("outcome")) > 0 AND "energy_level" BETWEEN 1 AND 5 AND "parent_id" IS NULL AND "project_id" IS NULL)
        OR
        ("type" <> 'Project' AND "outcome" IS NULL AND "energy_level" IS NULL)
    ),
    CONSTRAINT "items_task_status_check" CHECK (
        "type" <> 'Task' OR "status" IN ('Active', 'Today', 'Waiting', 'Blocked', 'Someday', 'Completed', 'Archived')
    )
);

-- CreateTable
CREATE TABLE "daily_reviews" (
    "id" BIGSERIAL NOT NULL,
    "date" DATE NOT NULL,
    "energy" INTEGER NOT NULL,
    "stress" INTEGER NOT NULL,
    "motivation" INTEGER NOT NULL,
    "notes" TEXT,
    "summary" TEXT NOT NULL,
    "attention_budget" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "daily_reviews_energy_check" CHECK ("energy" BETWEEN 1 AND 5),
    CONSTRAINT "daily_reviews_stress_check" CHECK ("stress" BETWEEN 1 AND 5),
    CONSTRAINT "daily_reviews_motivation_check" CHECK ("motivation" BETWEEN 1 AND 5),
    CONSTRAINT "daily_reviews_budget_check" CHECK ("attention_budget" BETWEEN 0 AND 100),
    CONSTRAINT "daily_reviews_summary_check" CHECK (length(btrim("summary")) > 0)
);

-- CreateIndex
CREATE INDEX "items_area_id_idx" ON "items"("area_id");

-- CreateIndex
CREATE INDEX "items_parent_order_idx" ON "items"("parent_id", "sort_order");

-- CreateIndex
CREATE INDEX "items_project_order_idx" ON "items"("project_id", "sort_order");

-- CreateIndex
CREATE INDEX "items_status_type_idx" ON "items"("status", "type");

-- CreateIndex
CREATE INDEX "daily_reviews_latest_idx" ON "daily_reviews"("date" DESC, "created_at" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
