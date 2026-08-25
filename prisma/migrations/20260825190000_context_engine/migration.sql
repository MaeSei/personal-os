-- Canonical multi-context Task metadata. Existing single-context values remain
-- in place during the compatibility window and are copied into the new array.
ALTER TABLE "items"
  ADD COLUMN "contexts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "items"
SET "contexts" = ARRAY[
  COALESCE(
    NULLIF(BTRIM("preferred_context"), ''),
    NULLIF(BTRIM("context"), '')
  )
]
WHERE "type" = 'TASK'
  AND COALESCE(
    NULLIF(BTRIM("preferred_context"), ''),
    NULLIF(BTRIM("context"), '')
  ) IS NOT NULL;

ALTER TABLE "items"
  ADD CONSTRAINT "items_contexts_nonblank_check"
  CHECK (array_position("contexts", '') IS NULL);
