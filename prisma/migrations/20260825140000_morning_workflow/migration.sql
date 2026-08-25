-- Existing Day Plans were already treated as accepted by Mission Control.
CREATE TYPE "day_plan_status" AS ENUM ('DRAFT', 'STARTED');

ALTER TABLE "day_plans"
ADD COLUMN "status" "day_plan_status" NOT NULL DEFAULT 'DRAFT';

UPDATE "day_plans" SET "status" = 'STARTED';
