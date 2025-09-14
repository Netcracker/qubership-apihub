-- maintain schema migration tables
CREATE TABLE IF NOT EXISTS public.schema_migrations
(
    "version" int4 NOT NULL,
    dirty     bool NOT NULL,
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);

CREATE TABLE IF NOT EXISTS public.stored_schema_migration
(
    num       int4    NOT NULL,
    up_hash   varchar NOT NULL,
    sql_up    varchar NOT NULL,
    down_hash varchar NULL,
    sql_down  varchar NULL,
    CONSTRAINT stored_schema_migration_pkey PRIMARY KEY (num)
);

-- remove all the previous migrations
truncate table public.stored_schema_migration;
truncate table public.schema_migrations;

INSERT INTO public.schema_migrations
VALUES (1, false);

-------------------------------------------

create table ruleset
(
    id             varchar
        constraint ruleset_pk
            primary key,
    name           varchar                     not null,
    status         varchar                     not null,
    data           bytea                       not null,
    created_at     timestamp without time zone not null,
    created_by     varchar,
    deleted_at     timestamp without time zone,
    deleted_by     varchar,
    api_type       varchar                     not null,
    linter         varchar                     not null,
    file_name      varchar                     not null,
    can_be_deleted bool                        not null,
    last_activated timestamp without time zone,
    constraint ruleset_name_unique unique (name)
);

insert into ruleset
values ('f4bd4da4-56d4-42ea-9667-36fb1a4c53c6', 'default-openapi-2-0', 'active',
        'extends: [[spectral:oas, recommended]]'::BYTEA, now(), 'system', null, null, 'openapi-2-0', 'spectral',
        'default-openapi-2-0.yaml', false);
insert into ruleset
values ('bc356817-06dc-45a7-a91b-af0d9ad7a2eb', 'default-openapi-3-0', 'active',
        'extends: [[spectral:oas, recommended]]'::BYTEA, now(), 'system', null, null, 'openapi-3-0', 'spectral',
        'default-openapi-3-0.yaml', false);
insert into ruleset
values ('e3fcd2b3-187b-4bcf-970d-d6dbcf30a83a', 'default-openapi-3-1', 'active',
        'extends: [[spectral:oas, recommended]]'::BYTEA, now(), 'system', null, null, 'openapi-3-1', 'spectral',
        'default-openapi-3-1.yaml', false);

create table ruleset_activation_history
(
    ruleset_id     varchar
        constraint ruleset_activation_history_ruleset_id_fk
            references ruleset (id),
    activated_at   timestamp without time zone not null,
    activated_by   varchar                     not null,
    deactivated_at timestamp without time zone,
    deactivated_by varchar
);

insert into ruleset_activation_history
values ('f4bd4da4-56d4-42ea-9667-36fb1a4c53c6', now(), 'system', null, '');
insert into ruleset_activation_history
values ('bc356817-06dc-45a7-a91b-af0d9ad7a2eb', now(), 'system', null, '');
insert into ruleset_activation_history
values ('e3fcd2b3-187b-4bcf-970d-d6dbcf30a83a', now(), 'system', null, '');

---------- tasks -------------

create table version_lint_task
(
    id            varchar
        constraint ver_tasks_pk primary key,
    package_id    varchar                     not null,
    version       varchar                     not null,
    revision      integer                     not null,
    event_id      varchar,
    created_at    timestamp without time zone not null,
    created_by    varchar                     not null,
    status        varchar                     not null, -- task status
    details       varchar,                              -- task details
    executor_id   varchar,
    last_active   timestamp without time zone,
    restart_count integer                     not null,
    priority      integer DEFAULT 0           NOT NULL
);

alter table version_lint_task
    add constraint version_lint_task_event_id_unique
        unique (event_id);


create table document_lint_task
(
    id                   varchar
        constraint doc_tasks_pk primary key,
    version_lint_task_id varchar                     not null,

    package_id           varchar                     not null,
    version              varchar                     not null,
    revision             integer                     not null,
    file_id              varchar                     not null,
    file_slug            varchar                     not null,

    api_type             varchar                     not null,
    linter               varchar                     not null,
    ruleset_id           varchar
        constraint ruleset_document_lint_task_ruleset_id_fk
            references ruleset (id),
    created_at           timestamp without time zone not null,

    status               varchar                     not null, -- task status
    details              varchar,
    executor_id          varchar,
    last_active          timestamp without time zone,
    restart_count        integer                     not null,
    lint_time_ms         integer,
    priority             integer DEFAULT 0           NOT NULL
);

alter table document_lint_task
    add constraint document_lint_task_version_lint_task_id_fk
        foreign key (version_lint_task_id) references version_lint_task (id);

-------- results ----------

create table linted_version
(
    package_id   varchar                     not null,
    version      varchar                     not null,
    revision     integer                     not null,

    lint_status  varchar                     not null,
    lint_details varchar,

    linted_at    timestamp without time zone not null,
    constraint linted_version_pk
        primary key (package_id, version, revision)
);


create table linted_document
(
    package_id         varchar not null,
    version            varchar not null,
    revision           integer not null,
    file_id            varchar not null,
    slug               varchar not null,
    specification_type varchar not null,
    ruleset_id         varchar not null,
    data_hash          varchar not null,
    lint_status        varchar not null,
    lint_details       varchar,

    constraint linted_document_pk
        primary key (package_id, version, revision, file_id),
    constraint linted_document_ruleset_fk
        foreign key (ruleset_id) references ruleset (id)
);

create index linted_document_package_id_version_revision_slug_index
    on linted_document (package_id, version, revision, slug);

create table lint_file_result
(
    data_hash      varchar not null,
    ruleset_id     varchar not null
        constraint lint_file_result_ruleset_id_fk
            references ruleset (id),
    linter_version varchar not null,
    data           bytea   not null,
    summary        jsonb   not null,
    constraint lint_file_result_pk
        primary key (data_hash, ruleset_id) -- TODO: add linter_version to PK???
);

