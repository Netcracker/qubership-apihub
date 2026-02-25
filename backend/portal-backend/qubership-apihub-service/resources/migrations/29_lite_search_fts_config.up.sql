TRUNCATE fts_latest_release_operation_data;

WITH maxrev AS (
    SELECT package_id, version, max(revision) AS revision
    FROM published_version pv
        INNER JOIN package_group pg
            ON pg.id = pv.package_id
            AND pg.exclude_from_search = false
    GROUP BY package_id, version
),
versions AS (
    SELECT pv.package_id, pv.version, pv.revision
    FROM published_version pv
        INNER JOIN maxrev
            ON pv.package_id = maxrev.package_id
            AND pv.version = maxrev.version
            AND pv.revision = maxrev.revision
    WHERE pv.deleted_at IS NULL
      AND status = 'release'
),
operations_data AS (
    SELECT o.package_id, o.version, o.revision, o.operation_id, o.type, od.data
    FROM operation_data od
        INNER JOIN operation o ON od.data_hash = o.data_hash
        INNER JOIN versions v
            ON v.package_id = o.package_id
            AND v.version = o.version
            AND v.revision = o.revision
)
INSERT INTO fts_latest_release_operation_data
SELECT
    operations_data.package_id,
    operations_data.version,
    operations_data.revision,
    operations_data.operation_id,
    operations_data.type,
    to_tsvector(convert_from(operations_data.data, 'UTF-8'))
    || to_tsvector(regexp_replace(convert_from(operations_data.data, 'UTF-8'), '[-/_.]', ' ', 'g'))
    AS data_vector
FROM operations_data;
