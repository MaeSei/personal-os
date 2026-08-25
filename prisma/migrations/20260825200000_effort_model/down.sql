ALTER TABLE "items"
    DROP COLUMN IF EXISTS "estimate_confidence";

DROP TYPE IF EXISTS "estimate_confidence";
