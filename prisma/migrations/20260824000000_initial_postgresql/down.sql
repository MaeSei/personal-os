-- Roll back only an empty/fresh Atlas installation.
-- This removes all persisted Atlas data and must never be run as routine recovery.
DROP TABLE IF EXISTS "daily_reviews";
DROP TABLE IF EXISTS "items";
DROP TABLE IF EXISTS "areas";
DROP TYPE IF EXISTS "item_status";
DROP TYPE IF EXISTS "item_type";
DROP TYPE IF EXISTS "area_color";
