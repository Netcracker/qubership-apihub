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

update version_score
set process_status                = 'completed',
    publication_integrity_status  = 'completed',
    backward_compatibility_status = 'completed',
    quality_check_status          = 'completed';

alter table version_score
    alter column process_status set not null,
    alter column publication_integrity_status set not null,
    alter column backward_compatibility_status set not null,
    alter column quality_check_status set not null;

alter table linted_version
    add column validation_process_id varchar;
