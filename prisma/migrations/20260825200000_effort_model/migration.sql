CREATE TYPE "estimate_confidence" AS ENUM (
    'Low',
    'Medium',
    'High'
);

ALTER TABLE "items"
    ADD COLUMN "estimate_confidence" "estimate_confidence";

-- Existing effort and energy columns already store the current 1–5 estimates.
-- Confidence remains unknown for existing Tasks; this migration invents none.
