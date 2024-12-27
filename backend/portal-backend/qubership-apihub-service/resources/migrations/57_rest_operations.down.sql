ALTER TABLE published_version_revision_content DROP COLUMN operation_ids;
DROP TABLE IF EXISTS operation;
DROP TABLE IF EXISTS operation_data;
DROP TABLE IF EXISTS changed_operation;