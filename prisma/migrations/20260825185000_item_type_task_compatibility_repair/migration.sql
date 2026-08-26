-- Compatibility repair for the untouched Context Engine migration.
--
-- Prisma 7 does not wrap PostgreSQL migrations in a transaction by default.
-- A failed Context Engine attempt can therefore leave its newly-added,
-- default-empty contexts column behind. Remove only that provably empty
-- partial artifact so the original migration can be retried unchanged.
BEGIN;

DO $atlas_repair$
DECLARE
    has_contexts_column BOOLEAN;
    has_nonempty_contexts BOOLEAN;
    has_pascal_task BOOLEAN;
    has_upper_task BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'items'
          AND column_name = 'contexts'
    ) INTO has_contexts_column;

    IF has_contexts_column THEN
        EXECUTE 'SELECT EXISTS (
            SELECT 1
            FROM "public"."items"
            WHERE CARDINALITY("contexts") > 0
        )' INTO has_nonempty_contexts;

        IF has_nonempty_contexts THEN
            RAISE EXCEPTION
                'Atlas compatibility repair found non-empty items.contexts and will not remove it.'
                USING HINT = 'Stop deployment and preserve those values with a separately reviewed forward migration.';
        END IF;

        EXECUTE 'ALTER TABLE "public"."items" DROP COLUMN "contexts"';
    END IF;

    SELECT
        COALESCE(BOOL_OR(enum_value.enumlabel = 'Task'), false),
        COALESCE(BOOL_OR(enum_value.enumlabel = 'TASK'), false)
    INTO has_pascal_task, has_upper_task
    FROM pg_catalog.pg_enum AS enum_value
    JOIN pg_catalog.pg_type AS enum_type
      ON enum_type.oid = enum_value.enumtypid
    JOIN pg_catalog.pg_namespace AS enum_schema
      ON enum_schema.oid = enum_type.typnamespace
    WHERE enum_schema.nspname = 'public'
      AND enum_type.typname = 'item_type';

    IF has_pascal_task AND NOT has_upper_task THEN
        EXECUTE 'ALTER TYPE "public"."item_type" RENAME VALUE ''Task'' TO ''TASK''';
    ELSIF has_upper_task AND NOT has_pascal_task THEN
        NULL;
    ELSE
        RAISE EXCEPTION
            'Atlas expected item_type to contain exactly one of Task or TASK.'
            USING HINT = 'Inspect pg_catalog.pg_enum before retrying; this migration will not guess.';
    END IF;
END
$atlas_repair$;

COMMIT;
