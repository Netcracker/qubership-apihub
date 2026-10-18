DROP TABLE IF EXISTS ts_operation_data;
DROP TABLE IF EXISTS fts_operation_data;
DROP TABLE IF EXISTS fts_latest_release_operation_data;

ALTER TABLE operation_data DROP COLUMN IF EXISTS search_scope;

-- remove full-text search rows orphaned by migrations
-- during migration, the list of operations may change due to a new builder implementation, but previously we did not clean them up
DELETE FROM fts_operation_search_text fts
WHERE NOT EXISTS (
    SELECT 1 FROM operation o
    WHERE o.package_id = fts.package_id
        AND o.version = fts.version
        AND o.revision = fts.revision
        AND o.operation_id = fts.operation_id
);
