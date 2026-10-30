CREATE TABLE IF NOT EXISTS fts_operation_search_text
(
    package_id       varchar NOT NULL,
    version          varchar NOT NULL,
    revision         integer NOT NULL,
    operation_id     varchar NOT NULL,
    status           varchar NOT NULL,
    api_type         varchar NOT NULL,
    search_data_hash varchar,
    data_vector      tsvector,
    CONSTRAINT pk_fts_operation_search_text PRIMARY KEY (package_id, version, revision, operation_id)
);

CREATE INDEX fts_operation_search_text_data_vector_idx
    ON fts_operation_search_text USING gin (data_vector);

-- Only REST and AsyncAPI are populated since existing GraphQL operation data
-- is not suitable for direct tsvector conversion.
with maxrev as
         (select package_id, version, max(revision) as revision
          from published_version pv
                   inner join package_group pg
                              on pg.id = pv.package_id
                                  and pg.exclude_from_search = false
          where pv.deleted_at is null
          group by package_id, version),
     versions as
         (select pv.package_id, pv.version, pv.revision, pv.status
          from published_version pv
                   inner join maxrev
                              on pv.package_id = maxrev.package_id
                                  and pv.version = maxrev.version
                                  and pv.revision = maxrev.revision
          where pv.deleted_at is null),
     operations as
         (select o.package_id, o.version, o.revision, o.operation_id, o.type, o.data_hash, o.title, v.status
          from operation o
                   inner join versions v
                              on v.package_id = o.package_id
                                  and v.version = o.version
                                  and v.revision = o.revision
          where o.type in ('rest', 'asyncapi')
            and o.data_hash is not null),
     operations_data as
         (select ops.package_id, ops.version, ops.revision, ops.operation_id, ops.type, ops.status, ops.data_hash, ops.title, od.data
          from operations ops
                   inner join operation_data od
                              on od.data_hash = ops.data_hash)
insert
into fts_operation_search_text (package_id, version, revision, operation_id, status, api_type, search_data_hash, data_vector)
select operations_data.package_id,
       operations_data.version,
       operations_data.revision,
       operations_data.operation_id,
       operations_data.status,
       operations_data.type,
       operations_data.data_hash,
       to_tsvector(convert_from(operations_data.data, 'UTF-8') || ' ' || coalesce(operations_data.title, '')) data_vector
from operations_data;

-- Clean stale fts_latest_release_operation_data rows for packages excluded from search.
DELETE FROM fts_latest_release_operation_data
WHERE package_id IN (SELECT id FROM package_group WHERE exclude_from_search = true);

DROP TABLE IF EXISTS ts_rest_operation_data;

-- Remove search scopes different from scope 'all'
UPDATE operation_data
SET search_scope = CASE
    WHEN search_scope ? 'all' THEN jsonb_build_object('all', search_scope->'all')
    ELSE '{}'::jsonb
END
WHERE search_scope IS NOT NULL
  AND search_scope != '{}'::jsonb
  AND search_scope - 'all' != '{}'::jsonb;

ALTER TABLE build_cleanup_run
    DROP COLUMN IF EXISTS operation_data,
    DROP COLUMN IF EXISTS ts_operation_data,
    DROP COLUMN IF EXISTS ts_rest_operation_data,
    DROP COLUMN IF EXISTS ts_gql_operation_data;
