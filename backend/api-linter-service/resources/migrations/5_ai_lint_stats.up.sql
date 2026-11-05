create table ai_lint_stats
(
    id                    varchar                     not null,
    document_lint_task_id varchar                     not null,
    package_id            varchar                     not null,
    version               varchar                     not null, -- noqa: RF04
    revision              integer                     not null,
    file_id               varchar                     not null,
    stage                 varchar                     not null, -- noqa: RF04
    model                 varchar                     not null, -- noqa: RF04
    status                varchar                     not null,
    error_class           varchar                     not null,
    error_message         varchar                     not null,
    requests              integer                     not null,
    prompt_tokens         integer                     not null,
    completion_tokens     integer                     not null,
    duration_ms           integer                     not null,
    details               jsonb                       not null,
    created_at            timestamp without time zone not null,

    constraint ai_lint_stats_pk
        primary key (id)
);

create index ai_lint_stats_document_lint_task_id_index
    on ai_lint_stats (document_lint_task_id);
