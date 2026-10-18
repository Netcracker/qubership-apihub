DROP TABLE IF EXISTS soft_deleted_data_cleanup_run;

ALTER TABLE operation_open_count
    DROP CONSTRAINT IF EXISTS operation_open_count_package_group_id_fk;

ALTER TABLE ts_graphql_operation_data
    DROP CONSTRAINT IF EXISTS ts_graphql_operation_data_operation_data_hash_fk;

ALTER TABLE ts_operation_data
    DROP CONSTRAINT IF EXISTS ts_operation_data_operation_data_hash_fk;

DELETE
FROM versions_cleanup_run vcr
WHERE vcr.package_id IS NOT NULL AND NOT EXISTS (SELECT 1
                  FROM package_group pg
                  WHERE pg.id = vcr.package_id);

ALTER TABLE versions_cleanup_run
    ADD CONSTRAINT versions_cleanup_run_package_group_id_fk
        FOREIGN KEY (package_id) REFERENCES package_group (id)
            ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.published_content_messages
(
    checksum character varying NOT NULL,
    messages jsonb,
    CONSTRAINT "PK_published_content_messages" PRIMARY KEY (checksum)
);
