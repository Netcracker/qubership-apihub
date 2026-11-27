create table version_validation_process
(
    id         varchar                     not null
        constraint version_validation_process_pk primary key,
    package_id varchar                     not null,
    version    varchar                     not null, -- noqa: RF04
    revision   integer                     not null,
    created_at timestamp without time zone not null,
    status     varchar                     not null
);

create unique index version_validation_process_processing_unique
on version_validation_process (package_id, version, revision)
where status = 'processing';

alter table version_lint_task
    add column validation_process_id varchar
        constraint version_lint_task_validation_process_id_unique unique
        constraint version_lint_task_validation_process_id_fk references version_validation_process (id);

create table version_scoring_task
(
    id                    varchar                     not null
        constraint version_scoring_task_pk primary key,
    validation_process_id varchar                     not null
        constraint version_scoring_task_validation_process_id_unique unique
        constraint version_scoring_task_validation_process_id_fk references version_validation_process (id),
    package_id            varchar                     not null,
    version               varchar                     not null, -- noqa: RF04
    revision              integer                     not null,
    created_at            timestamp without time zone not null,
    created_by            varchar                     not null,
    status                varchar                     not null,
    details               varchar,
    executor_id           varchar,
    last_active           timestamp without time zone not null,
    restart_count         integer default 0           not null,
    priority              integer default 0           not null,
    handled_doc_task_ids  varchar[],
    last_attempt_errors   jsonb
);

create index version_scoring_task_claim_index on version_scoring_task (created_at)
where status in ('not_started', 'processing');

create index version_scoring_task_executor_index on version_scoring_task (executor_id)
where status = 'processing';

alter table version_score
    add column validation_process_id varchar,
    add column process_details       jsonb;

with markers as (
    select
        package_id,
        version, -- noqa: RF04
        revision,
        debug,
        nullif(publication_integrity_details, 'null'::jsonb) is null as before_integrity,
        coalesce(
            publication_integrity_details ->> 'reason' = 'Internal error: failed to get version content.', false
        ) as integrity_failed,
        coalesce(
            'Internal error: failed to calculate backwards compatibility details.' = any(reasons), false
        ) as bwc_message,
        coalesce(
            'Internal error: failed to calculate quality check details.' = any(reasons), false
        ) as quality_message,
        nullif(backward_compatibility_details, 'null'::jsonb) is null as bwc_missing,
        nullif(quality_check_details, 'null'::jsonb) is null as quality_missing,
        coalesce((
            select count(*)::integer
            from jsonb_each(nullif(version_score.quality_check_details, 'null'::jsonb)) as api_kind
            cross join lateral jsonb_array_elements(
                case when jsonb_typeof(api_kind.value) = 'array' then api_kind.value else '[]'::jsonb end
            ) as entry
            where coalesce((entry.value ->> 'optional')::boolean, false) = false
                and (
                    coalesce(entry.value ->> 'internalErrors', '') <> ''
                    or (
                        entry.value ->> 'status' = 'not_passed'
                        and coalesce(
                            case
                                when jsonb_typeof(entry.value -> 'errorsCount') = 'number'
                                    then (entry.value ->> 'errorsCount')::numeric
                                else 0
                            end,
                            0
                        ) = 0
                    )
                )
        ), 0) as unavailable_required_count
    from version_score
),

outcomes as (
    select
        m.package_id,
        m.version, -- noqa: RF04
        m.revision,
        m.integrity_failed,
        m.unavailable_required_count,
        m.integrity_failed or (m.bwc_message and (not m.before_integrity or m.bwc_missing)) as bwc_failed,
        m.quality_message
        or (m.before_integrity and m.bwc_message and m.quality_missing)
        or m.unavailable_required_count > 0 as quality_failed,
        (
            select jsonb_agg(coalesce(u.elem, '') order by u.ord)
            from unnest(m.debug) with ordinality as u (elem, ord)
            where m.unavailable_required_count = 0
                or coalesce(u.elem, '') <> format(
                    'qualityCheck: %s required lint result(s) unavailable',
                    m.unavailable_required_count
                )
        ) as legacy_debug
    from markers as m
)

update version_score as s
set process_details = jsonb_build_object(
    'processStatus',
    case
        when o.integrity_failed or o.bwc_failed or o.quality_failed or o.legacy_debug is not null then 'error'
        else 'success'
    end,
    'publicationIntegrity',
    jsonb_build_object('processStatus', case when o.integrity_failed then 'error' else 'success' end)
    || case
        when o.integrity_failed or nullif(s.publication_integrity_details, 'null'::jsonb) is null then '{}'::jsonb
        else jsonb_build_object('details', s.publication_integrity_details)
    end,
    'backwardsCompatibility',
    jsonb_build_object('processStatus', case when o.bwc_failed then 'error' else 'success' end)
    || case
        when nullif(s.backward_compatibility_details, 'null'::jsonb) is null then '{}'::jsonb
        else jsonb_build_object('details', s.backward_compatibility_details)
    end,
    'qualityCheck',
    jsonb_build_object('processStatus', case when o.quality_failed then 'error' else 'success' end)
    || case
        when nullif(s.quality_check_details, 'null'::jsonb) is null then '{}'::jsonb
        else jsonb_build_object('details', s.quality_check_details)
    end
    || case
        when o.unavailable_required_count > 0 then jsonb_build_object(
            'debug',
            jsonb_build_array(format('%s required lint result(s) unavailable', o.unavailable_required_count))
        )
        else '{}'::jsonb
    end
)
|| case
    when o.legacy_debug is not null then jsonb_build_object('debug', o.legacy_debug)
    else '{}'::jsonb
end
from outcomes as o
where (s.package_id, s.version, s.revision) = (o.package_id, o.version, o.revision); -- noqa: RF04

alter table version_score
    alter column process_details set not null,
    drop column debug,
    drop column publication_integrity_details,
    drop column backward_compatibility_details,
    drop column quality_check_details;

alter table linted_version
    add column validation_process_id varchar;
