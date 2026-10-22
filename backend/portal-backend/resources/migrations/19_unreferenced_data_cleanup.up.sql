CREATE TABLE unreferenced_data_cleanup_run
(
    run_id        UUID PRIMARY KEY,
    instance_id   UUID                        NOT NULL,
    started_at    TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    finished_at   TIMESTAMP WITHOUT TIME ZONE,
    status        VARCHAR                     NOT NULL,
    details       VARCHAR,
    deleted_items JSONB
);

DELETE FROM fts_operation_data ftsod
WHERE NOT EXISTS (SELECT 1
                  FROM operation_data od
                  WHERE od.data_hash = ftsod.data_hash);

ALTER TABLE fts_operation_data
    ADD CONSTRAINT fts_operation_data_operation_data_hash_fk
        FOREIGN KEY (data_hash) REFERENCES operation_data (data_hash)
            ON UPDATE CASCADE ON DELETE CASCADE;
