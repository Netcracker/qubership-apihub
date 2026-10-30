CREATE TABLE soft_deleted_data_cleanup_run
(
    run_id        UUID PRIMARY KEY,
    instance_id   UUID                        NOT NULL,
    started_at    TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    finished_at   TIMESTAMP WITHOUT TIME ZONE,
    status        VARCHAR                     NOT NULL,
    details       VARCHAR,
    delete_before TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    deleted_items JSONB
);

DELETE
FROM operation_open_count ooc
WHERE NOT EXISTS (SELECT 1
                  FROM package_group pg
                  WHERE pg.id = ooc.package_id);

ALTER TABLE operation_open_count
    ADD CONSTRAINT operation_open_count_package_group_id_fk
        FOREIGN KEY (package_id) REFERENCES package_group (id)
            ON UPDATE CASCADE ON DELETE CASCADE;

DELETE
FROM ts_graphql_operation_data tgod
WHERE NOT EXISTS (SELECT 1
                  FROM operation_data od
                  WHERE od.data_hash = tgod.data_hash);

ALTER TABLE ts_graphql_operation_data
    ADD CONSTRAINT ts_graphql_operation_data_operation_data_hash_fk
        FOREIGN KEY (data_hash) REFERENCES operation_data (data_hash)
            ON UPDATE CASCADE ON DELETE CASCADE;

DELETE
FROM ts_operation_data tod
WHERE NOT EXISTS (SELECT 1
                  FROM operation_data od
                  WHERE od.data_hash = tod.data_hash);

ALTER TABLE ts_operation_data
    ADD CONSTRAINT ts_operation_data_operation_data_hash_fk
        FOREIGN KEY (data_hash) REFERENCES operation_data (data_hash)
            ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE versions_cleanup_run
    DROP CONSTRAINT versions_cleanup_run_package_group_id_fk;

DROP TABLE IF EXISTS published_content_messages;
