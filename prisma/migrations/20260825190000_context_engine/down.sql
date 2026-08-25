-- Preserve the primary context when returning to the single-context schema.
UPDATE "items"
SET
  "context" = COALESCE("contexts"[1], "context"),
  "preferred_context" = COALESCE("contexts"[1], "preferred_context")
WHERE CARDINALITY("contexts") > 0;

ALTER TABLE "items"
  DROP CONSTRAINT IF EXISTS "items_contexts_nonblank_check",
  DROP COLUMN IF EXISTS "contexts";
