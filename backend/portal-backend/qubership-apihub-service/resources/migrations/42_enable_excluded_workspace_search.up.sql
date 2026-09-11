-- Enable search for workspaces that were excluded via exclude_from_search.
-- 1) Ensure global_search partitions for those workspaces
-- 2) Backfill missing FTS rows for packages in those workspace subtrees
-- 3) Flip exclude_from_search to false on those workspaces and their descendants

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

-- Packages under target workspaces (workspace root or any descendant).
CREATE TEMP TABLE tmp_target_excluded_pkgs ON COMMIT DROP AS
SELECT pg.id AS package_id
FROM package_group pg
         INNER JOIN tmp_target_excluded_ws tw
                    ON pg.id = tw.workspace_id
                        OR pg.id LIKE tw.workspace_id || '.%';

-- Latest non-deleted revision per version for target packages.
CREATE TEMP TABLE tmp_target_excluded_versions ON COMMIT DROP AS
WITH maxrev AS (SELECT pv.package_id, pv.version, max(pv.revision) AS revision
                FROM published_version pv
                         INNER JOIN tmp_target_excluded_pkgs tp ON tp.package_id = pv.package_id
                WHERE pv.deleted_at IS NULL
                GROUP BY pv.package_id, pv.version)
SELECT pv.package_id, pv.version, pv.revision, pv.status
FROM published_version pv
         INNER JOIN maxrev
                    ON pv.package_id = maxrev.package_id
                        AND pv.version = maxrev.version
                        AND pv.revision = maxrev.revision
WHERE pv.deleted_at IS NULL;

-- Operations FTS source rows for target packages.
CREATE TEMP TABLE tmp_ops_fts_backfill ON COMMIT DROP AS
WITH operations AS (SELECT o.package_id,
                           o.version,
                           o.revision,
                           o.operation_id,
                           o.type,
                           o.data_hash,
                           o.title,
                           v.status
                    FROM operation o
                             INNER JOIN tmp_target_excluded_versions v
                                        ON v.package_id = o.package_id
                                            AND v.version = o.version
                                            AND v.revision = o.revision
                    WHERE o.type IN ('rest', 'asyncapi')
                      AND o.data_hash IS NOT NULL)
SELECT ops.package_id,
       ops.version,
       ops.revision,
       ops.operation_id,
       ops.status,
       ops.type AS api_type,
       ops.data_hash AS search_data_hash,
       to_tsvector(convert_from(od.data, 'UTF-8') || ' ' || coalesce(ops.title, '')) AS data_vector
FROM operations ops
         INNER JOIN operation_data od ON od.data_hash = ops.data_hash;

INSERT INTO fts_operation_search_text (package_id, version, revision, operation_id, status, api_type, search_data_hash,
                                       data_vector)
SELECT package_id, version, revision, operation_id, status, api_type, search_data_hash, data_vector
FROM tmp_ops_fts_backfill
ON CONFLICT DO NOTHING;

INSERT INTO global_search.fts_operation_search_text (workspace_id, package_id, version, revision, operation_id, status,
                                                     api_type, search_data_hash, data_vector)
SELECT split_part(package_id, '.', 1),
       package_id,
       version,
       revision,
       operation_id,
       status,
       api_type,
       search_data_hash,
       data_vector
FROM tmp_ops_fts_backfill
ON CONFLICT DO NOTHING;

-- DDL FTS source rows for target packages.
CREATE TEMP TABLE tmp_ddl_fts_backfill ON COMMIT DROP AS
SELECT d.package_id,
       d.version,
       d.revision,
       d.ddl_entity_id,
       v.status,
       d.kind,
       d.data_hash AS search_data_hash,
       to_tsvector(convert_from(dd.data, 'UTF-8')) AS data_vector
FROM ddl_tables d
         INNER JOIN tmp_target_excluded_versions v
                    ON v.package_id = d.package_id
                        AND v.version = d.version
                        AND v.revision = d.revision
         INNER JOIN ddl_table_data dd ON dd.data_hash = d.data_hash
WHERE d.data_hash IS NOT NULL;

INSERT INTO fts_ddl_search_text (package_id, version, revision, ddl_entity_id, status, kind, search_data_hash,
                                 data_vector)
SELECT package_id, version, revision, ddl_entity_id, status, kind, search_data_hash, data_vector
FROM tmp_ddl_fts_backfill
ON CONFLICT DO NOTHING;

INSERT INTO global_search.fts_ddl_search_text (workspace_id, package_id, version, revision, ddl_entity_id, status, kind,
                                               search_data_hash, data_vector)
SELECT split_part(package_id, '.', 1),
       package_id,
       version,
       revision,
       ddl_entity_id,
       status,
       kind,
       search_data_hash,
       data_vector
FROM tmp_ddl_fts_backfill
ON CONFLICT DO NOTHING;

-- MCP FTS source rows for target packages.
CREATE TEMP TABLE tmp_mcp_fts_backfill ON COMMIT DROP AS
SELECT m.package_id,
       m.version,
       m.revision,
       m.mcp_entity_id,
       v.status,
       m.kind,
       m.data_hash AS search_data_hash,
       to_tsvector(convert_from(md.data, 'UTF-8') || ' ') AS data_vector
FROM mcp_entities m
         INNER JOIN tmp_target_excluded_versions v
                    ON v.package_id = m.package_id
                        AND v.version = m.version
                        AND v.revision = m.revision
         INNER JOIN mcp_entity_data md ON md.data_hash = m.data_hash
WHERE m.data_hash IS NOT NULL;

INSERT INTO fts_mcp_search_text (package_id, version, revision, mcp_entity_id, status, kind, search_data_hash,
                                 data_vector)
SELECT package_id, version, revision, mcp_entity_id, status, kind, search_data_hash, data_vector
FROM tmp_mcp_fts_backfill
ON CONFLICT DO NOTHING;

INSERT INTO global_search.fts_mcp_search_text (workspace_id, package_id, version, revision, mcp_entity_id, status, kind,
                                               search_data_hash, data_vector)
SELECT split_part(package_id, '.', 1),
       package_id,
       version,
       revision,
       mcp_entity_id,
       status,
       kind,
       search_data_hash,
       data_vector
FROM tmp_mcp_fts_backfill
ON CONFLICT DO NOTHING;

-- Flip exclude_from_search on target workspaces and all descendants.
UPDATE package_group pg
SET exclude_from_search = false
FROM tmp_target_excluded_ws tw
WHERE pg.id = tw.workspace_id
   OR pg.id LIKE tw.workspace_id || '.%';
