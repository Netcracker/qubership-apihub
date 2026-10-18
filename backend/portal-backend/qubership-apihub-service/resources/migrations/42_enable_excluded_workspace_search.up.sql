-- Enable search for workspaces that were excluded via exclude_from_search.
-- 1) Ensure global_search partitions for those workspaces
-- 2) Flip exclude_from_search to false on those workspaces and their descendants

-- Target workspaces (kind=workspace, currently excluded).
CREATE TEMP TABLE tmp_target_excluded_ws ON COMMIT DROP AS
SELECT id AS workspace_id
FROM package_group
WHERE kind = 'workspace'
  AND exclude_from_search = true;

-- Ensure LIST partitions exist for each target workspace.
DO
$$
    DECLARE
        r    RECORD;
        slug text;
    BEGIN
        FOR r IN SELECT workspace_id FROM tmp_target_excluded_ws
            LOOP
                slug := 'p_' || md5(r.workspace_id);
                INSERT INTO global_search.workspace_registry (workspace_id, partition_slug)
                VALUES (r.workspace_id, slug)
                ON CONFLICT (workspace_id) DO NOTHING;

                SELECT partition_slug INTO slug
                FROM global_search.workspace_registry
                WHERE workspace_id = r.workspace_id;

                EXECUTE format(
                        'CREATE TABLE IF NOT EXISTS global_search.fts_operation_search_text_%s PARTITION OF global_search.fts_operation_search_text FOR VALUES IN (%L)',
                        slug, r.workspace_id);
                EXECUTE format(
                        'CREATE TABLE IF NOT EXISTS global_search.fts_ddl_search_text_%s PARTITION OF global_search.fts_ddl_search_text FOR VALUES IN (%L)',
                        slug, r.workspace_id);
                EXECUTE format(
                        'CREATE TABLE IF NOT EXISTS global_search.fts_mcp_search_text_%s PARTITION OF global_search.fts_mcp_search_text FOR VALUES IN (%L)',
                        slug, r.workspace_id);
            END LOOP;
    END
$$;

-- Flip exclude_from_search on target workspaces and all descendants.
UPDATE package_group pg
SET exclude_from_search = false
FROM tmp_target_excluded_ws tw
WHERE pg.id = tw.workspace_id
   OR pg.id LIKE tw.workspace_id || '.%';
