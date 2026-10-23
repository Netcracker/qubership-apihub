create table ai_lint_stats
(
    id                    varchar                     not null,
    document_lint_task_id varchar                     not null,
    package_id            varchar                     not null,
    version               varchar                     not null,
    revision              integer                     not null,
    file_id               varchar                     not null,
    stage                 varchar                     not null,
    model                 varchar                     not null,
    status                varchar                     not null,
    error_class           varchar                     not null,
    requests              integer                     not null,
    prompt_tokens         integer                     not null,
    completion_tokens     integer                     not null,
    duration_ms           integer                     not null,
    details               jsonb                       not null,
    created_at            timestamp without time zone not null,

    constraint ai_lint_stats_pk
        primary key (id)
);
