CREATE TABLE IF NOT EXISTS fts_latest_release_operation_data
(
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    revision integer NOT NULL,
    operation_id character varying NOT NULL,
    api_type character varying NOT NULL,
    data_vector tsvector,

    CONSTRAINT pk_fts_latest_release_operation_data PRIMARY KEY (package_id,version,revision,operation_id)
);

CREATE INDEX fts_latest_release_operation_data_data_vector_index
    ON fts_latest_release_operation_data
        USING gin ("data_vector");


with maxrev as
         (select package_id, version, pg.name as package_name, max(revision) as revision
          from published_version pv
                   inner join package_group pg
                              on pg.id = pv.package_id
                                  and pg.exclude_from_search = false
          group by package_id, version, pg.name),
     versions as
         (select pv.package_id, pv.version, pv.revision, pv.published_at, pv.status, maxrev.package_name
          from published_version pv
                   inner join maxrev
                              on pv.package_id = maxrev.package_id
                                  and pv.version = maxrev.version
                                  and pv.revision = maxrev.revision
          where pv.deleted_at is null
            and status = 'release'),
     operations as
         (select o.*, v.status version_status, v.package_name, v.published_at version_published_at
          from operation o
                   inner join versions v
                              on v.package_id = o.package_id
                                  and v.version = o.version
                                  and v.revision = o.revision),
     operations_data as
         (select o.package_id, o.version, o.revision, o.operation_id, o.type, od.*
          from operation_data od
                   inner join operations o
                              on od.data_hash = o.data_hash)
insert
into fts_latest_release_operation_data
select operations_data.package_id,
       operations_data.version,
       operations_data.revision,
       operations_data.operation_id,
       operations_data.type,
       to_tsvector(convert_from(operations_data.data, 'UTF-8')) data_vector
from operations_data;
