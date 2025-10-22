DROP INDEX IF EXISTS operation_data_hash_idx;
DROP INDEX IF EXISTS pvrc_checksum_idx;

ALTER TABLE ts_graphql_operation_data DROP CONSTRAINT IF EXISTS ts_graphql_operation_data_operation_data_hash_fk;
ALTER TABLE ts_operation_data DROP CONSTRAINT IF EXISTS ts_operation_data_operation_data_hash_fk;
ALTER TABLE ts_rest_operation_data DROP CONSTRAINT IF EXISTS ts_rest_operation_data_operation_data_hash_fk;
ALTER TABLE fts_operation_data DROP CONSTRAINT IF EXISTS fts_operation_data_operation_data_hash_fk;
ALTER TABLE published_version_revision_content DROP CONSTRAINT IF EXISTS published_version_revision_content_published_data_fk;

ALTER TABLE ts_graphql_operation_data
    ADD CONSTRAINT ts_graphql_operation_data_operation_data_hash_fk
        FOREIGN KEY (data_hash) REFERENCES operation_data (data_hash)
            ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ts_operation_data
    ADD CONSTRAINT ts_operation_data_operation_data_hash_fk
        FOREIGN KEY (data_hash) REFERENCES operation_data (data_hash)
            ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ts_rest_operation_data
    ADD CONSTRAINT "FK_operation_data"
        FOREIGN KEY (data_hash) REFERENCES operation_data (data_hash)
            ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE fts_operation_data
    ADD CONSTRAINT fts_operation_data_operation_data_hash_fk
        FOREIGN KEY (data_hash) REFERENCES operation_data (data_hash)
            ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE published_version_revision_content
    ADD CONSTRAINT "FK_published_data"
        FOREIGN KEY (checksum,package_id) REFERENCES published_data (checksum,package_id)
            ON UPDATE CASCADE ON DELETE CASCADE;

DROP INDEX IF EXISTS ix_operation_pvrt;
DROP INDEX IF EXISTS ix_build_id_text;
DROP INDEX IF EXISTS ix_activity_tracking_package_e_type;
