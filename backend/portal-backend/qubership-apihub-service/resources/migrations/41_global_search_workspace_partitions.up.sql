CREATE SCHEMA IF NOT EXISTS global_search;

CREATE TABLE IF NOT EXISTS global_search.workspace_registry
(
    workspace_id   varchar                  NOT NULL,
    partition_slug varchar                  NOT NULL,
    created_at     timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT pk_global_search_workspace_registry PRIMARY KEY (workspace_id),
    CONSTRAINT uq_global_search_workspace_registry_slug UNIQUE (partition_slug)
);

CREATE TABLE IF NOT EXISTS global_search.fts_operation_search_text
(
    workspace_id     varchar NOT NULL,
    package_id       varchar NOT NULL,
    version          varchar NOT NULL,
    revision         integer NOT NULL,
    operation_id     varchar NOT NULL,
    status           varchar NOT NULL,
    api_type         varchar NOT NULL,
    search_data_hash varchar,
    data_vector      tsvector,
    CONSTRAINT pk_gs_fts_operation_search_text PRIMARY KEY (workspace_id, package_id, version, revision, operation_id)
) PARTITION BY LIST (workspace_id);

CREATE INDEX IF NOT EXISTS gs_fts_operation_search_text_data_vector_idx
    ON global_search.fts_operation_search_text USING gin (data_vector);

CREATE INDEX IF NOT EXISTS gs_fts_operation_search_text_scope_idx
    ON global_search.fts_operation_search_text (status, api_type, package_id varchar_pattern_ops);

CREATE TABLE IF NOT EXISTS global_search.fts_ddl_search_text
(
    workspace_id     varchar NOT NULL,
    package_id       varchar NOT NULL,
    version          varchar NOT NULL,
    revision         integer NOT NULL,
    ddl_entity_id    varchar NOT NULL,
    status           varchar NOT NULL,
    kind             varchar NOT NULL,
    search_data_hash varchar,
    data_vector      tsvector,
    CONSTRAINT pk_gs_fts_ddl_search_text PRIMARY KEY (workspace_id, package_id, version, revision, ddl_entity_id)
) PARTITION BY LIST (workspace_id);

CREATE INDEX IF NOT EXISTS gs_fts_ddl_search_text_data_vector_idx
    ON global_search.fts_ddl_search_text USING gin (data_vector);

CREATE TABLE IF NOT EXISTS global_search.fts_mcp_search_text
(
    workspace_id     varchar NOT NULL,
    package_id       varchar NOT NULL,
    version          varchar NOT NULL,
    revision         integer NOT NULL,
    mcp_entity_id    varchar NOT NULL,
    status           varchar NOT NULL,
    kind             varchar NOT NULL,
    search_data_hash varchar,
    data_vector      tsvector,
    CONSTRAINT pk_gs_fts_mcp_search_text PRIMARY KEY (workspace_id, package_id, version, revision, mcp_entity_id)
) PARTITION BY LIST (workspace_id);

CREATE INDEX IF NOT EXISTS gs_fts_mcp_search_text_data_vector_idx
    ON global_search.fts_mcp_search_text USING gin (data_vector);

-- Create one LIST partition per workspace id.
-- partition_slug keeps relation names short and identifier-safe.
DO
$$
    DECLARE
        r    RECORD;
        slug text;
    BEGIN
        FOR r IN
            SELECT id AS workspace_id
            FROM package_group
            WHERE kind = 'workspace'
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

-- Backfill from deprecated public.fts_* tables.
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
FROM fts_operation_search_text
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
FROM fts_ddl_search_text
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
FROM fts_mcp_search_text
ON CONFLICT DO NOTHING;
