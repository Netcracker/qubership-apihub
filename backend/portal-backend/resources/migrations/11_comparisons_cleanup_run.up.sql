CREATE TABLE IF NOT EXISTS comparisons_cleanup_run (
    run_id UUID PRIMARY KEY,
    instance_id UUID NOT NULL,
    started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR NOT NULL,
    details VARCHAR,
    delete_before TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    deleted_items INTEGER
);