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
    handled_doc_task_ids  varchar[]
);

create index version_scoring_task_claim_index on version_scoring_task (created_at)
where status in ('not_started', 'processing');

create index version_scoring_task_executor_index on version_scoring_task (executor_id)
where status = 'processing';

alter table version_score
    add column validation_process_id         varchar,
    add column process_status                varchar,
    add column publication_integrity_status  varchar,
    add column publication_integrity_error   varchar,
    add column backward_compatibility_status varchar,
    add column backward_compatibility_error  varchar,
    add column quality_check_status          varchar,
    add column quality_check_error           varchar;

with markers as (
    select
        package_id,
        version, -- noqa: RF04
        revision,
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
        nullif(quality_check_details, 'null'::jsonb) is null as quality_missing
    from version_score
),

outcomes as (
    select
        package_id,
        version, -- noqa: RF04
        revision,
        integrity_failed,
        integrity_failed or (bwc_message and (not before_integrity or bwc_missing)) as bwc_failed,
        quality_message or (before_integrity and bwc_message and quality_missing) as quality_failed
    from markers
)

update version_score as s
set publication_integrity_status  = case when o.integrity_failed then 'error' else 'success' end,
    backward_compatibility_status = case when o.bwc_failed then 'error' else 'success' end,
    quality_check_status          = case when o.quality_failed then 'error' else 'success' end,
    process_status                = case
        when o.integrity_failed or o.bwc_failed or o.quality_failed then 'error' else 'success'
    end
from outcomes as o
where (s.package_id, s.version, s.revision) = (o.package_id, o.version, o.revision); -- noqa: RF04

alter table version_score
    alter column process_status set not null,
    alter column publication_integrity_status set not null,
    alter column backward_compatibility_status set not null,
    alter column quality_check_status set not null;

alter table linted_version
    add column validation_process_id varchar;
