ALTER TABLE versions_cleanup_run
ALTER COLUMN package_id DROP NOT NULL;

ALTER TABLE versions_cleanup_run
ADD COLUMN IF NOT EXISTS instance_id uuid;

CREATE TABLE IF NOT EXISTS locks (
    name VARCHAR PRIMARY KEY,
    instance_id VARCHAR NOT NULL,
    acquired_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    version BIGINT NOT NULL DEFAULT 1
); 