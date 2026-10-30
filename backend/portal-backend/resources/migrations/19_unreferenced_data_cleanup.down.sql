DROP TABLE IF EXISTS unreferenced_data_cleanup_run;

ALTER TABLE fts_operation_data
    DROP CONSTRAINT IF EXISTS fts_operation_data_operation_data_hash_fk;
