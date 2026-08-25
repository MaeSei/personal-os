-- CreateTable
CREATE TABLE "day_plans" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time_zone" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "day_plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "day_plans_required_text_check" CHECK (
        length(btrim("id")) > 0 AND length(btrim("time_zone")) > 0
    )
);

-- CreateTable
CREATE TABLE "day_plan_tasks" (
    "day_plan_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "day_plan_tasks_pkey" PRIMARY KEY ("day_plan_id", "task_id"),
    CONSTRAINT "day_plan_tasks_position_check" CHECK ("position" >= 0)
);

-- CreateTable
CREATE TABLE "time_blocks" (
    "id" TEXT NOT NULL,
    "day_plan_id" TEXT NOT NULL,
    "task_id" TEXT,
    "title" TEXT NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "time_blocks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "time_blocks_required_text_check" CHECK (
        length(btrim("id")) > 0 AND length(btrim("title")) > 0
    ),
    CONSTRAINT "time_blocks_start_check" CHECK (
        "start_minute" >= 0 AND "start_minute" < 1440
    ),
    CONSTRAINT "time_blocks_duration_check" CHECK (
        "duration_minutes" > 0 AND "start_minute" + "duration_minutes" <= 1440
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "day_plans_date_key" ON "day_plans"("date");

-- CreateIndex
CREATE INDEX "day_plan_tasks_order_idx" ON "day_plan_tasks"("day_plan_id", "position");

-- CreateIndex
CREATE INDEX "day_plan_tasks_task_id_idx" ON "day_plan_tasks"("task_id");

-- CreateIndex
CREATE INDEX "time_blocks_plan_start_idx" ON "time_blocks"("day_plan_id", "start_minute");

-- CreateIndex
CREATE INDEX "time_blocks_task_id_idx" ON "time_blocks"("task_id");

-- AddForeignKey
ALTER TABLE "day_plan_tasks" ADD CONSTRAINT "day_plan_tasks_day_plan_id_fkey" FOREIGN KEY ("day_plan_id") REFERENCES "day_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_plan_tasks" ADD CONSTRAINT "day_plan_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_day_plan_id_fkey" FOREIGN KEY ("day_plan_id") REFERENCES "day_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
