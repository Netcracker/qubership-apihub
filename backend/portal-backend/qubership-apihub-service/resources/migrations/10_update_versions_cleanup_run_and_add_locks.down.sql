ALTER TABLE versions_cleanup_run
DROP COLUMN IF EXISTS instance_id;

DROP TABLE IF EXISTS locks; 