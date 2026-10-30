CREATE INDEX IF NOT EXISTS operation_data_hash_idx ON operation (data_hash);
CREATE INDEX IF NOT EXISTS pvrc_checksum_idx ON published_version_revision_content(checksum);

ALTER TABLE ts_graphql_operation_data DROP CONSTRAINT IF EXISTS ts_graphql_operation_data_operation_data_hash_fk;
ALTER TABLE ts_operation_data DROP CONSTRAINT IF EXISTS ts_operation_data_operation_data_hash_fk;
ALTER TABLE ts_rest_operation_data DROP CONSTRAINT IF EXISTS "FK_operation_data";
ALTER TABLE fts_operation_data DROP CONSTRAINT IF EXISTS fts_operation_data_operation_data_hash_fk;
ALTER TABLE published_version_revision_content DROP CONSTRAINT IF EXISTS "FK_published_data";

ALTER TABLE ts_graphql_operation_data
    ADD CONSTRAINT ts_graphql_operation_data_operation_data_hash_fk
        FOREIGN KEY (data_hash) REFERENCES operation_data (data_hash)
            ON UPDATE CASCADE;

ALTER TABLE ts_operation_data
    ADD CONSTRAINT ts_operation_data_operation_data_hash_fk
        FOREIGN KEY (data_hash) REFERENCES operation_data (data_hash)
            ON UPDATE CASCADE;

ALTER TABLE ts_rest_operation_data
    ADD CONSTRAINT ts_rest_operation_data_operation_data_hash_fk
        FOREIGN KEY (data_hash) REFERENCES operation_data (data_hash)
            ON UPDATE CASCADE;

ALTER TABLE fts_operation_data
    ADD CONSTRAINT fts_operation_data_operation_data_hash_fk
        FOREIGN KEY (data_hash) REFERENCES operation_data (data_hash)
            ON UPDATE CASCADE;

ALTER TABLE published_version_revision_content
    ADD CONSTRAINT published_version_revision_content_published_data_fk
        FOREIGN KEY (checksum,package_id) REFERENCES published_data (checksum,package_id)
            ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS ix_operation_pvrt ON operation (package_id, version, revision, type);
CREATE INDEX IF NOT EXISTS ix_build_id_text ON build ((build_id::text));
CREATE INDEX IF NOT EXISTS ix_activity_tracking_package_e_type ON activity_tracking (package_id, e_type);
