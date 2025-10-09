-- maintain schema migration tables
CREATE TABLE IF NOT EXISTS public.schema_migrations
(
    version int4 NOT NULL,
    dirty bool NOT NULL,
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);

CREATE TABLE IF NOT EXISTS public.stored_schema_migration
(
    num int4 NOT NULL,
    up_hash varchar NOT NULL,
    sql_up varchar NOT NULL,
    down_hash varchar NULL,
    sql_down varchar NULL,
    CONSTRAINT stored_schema_migration_pkey PRIMARY KEY (num)
);

-- remove all the previous migrations
TRUNCATE TABLE public.stored_schema_migration;
TRUNCATE TABLE public.schema_migrations;

INSERT INTO public.schema_migrations
VALUES (1, false);

-------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent
(
    agent_id varchar NOT NULL,
    cloud varchar NOT NULL,
    namespace varchar NOT NULL,
    url varchar NOT NULL,
    last_active timestamp without time zone NOT NULL,
    backend_version varchar NOT NULL,
    name varchar,
    agent_version varchar,
    CONSTRAINT agent_pkey PRIMARY KEY (agent_id)
);

CREATE TABLE IF NOT EXISTS namespace_security_check
(
    process_id varchar NOT NULL,
    agent_id varchar NOT NULL,
    namespace varchar NOT NULL,
    workspace_id varchar NOT NULL,
    cloud_name varchar,
    status varchar NOT NULL,
    details varchar,
    started_at timestamp without time zone,
    started_by varchar,
    finished_at timestamp without time zone,
    CONSTRAINT namespace_security_check_pkey PRIMARY KEY (process_id)
);

CREATE TABLE IF NOT EXISTS namespace_security_check_result
(
    process_id varchar NOT NULL,
    service_id varchar,
    method varchar,
    path varchar,
    security varchar [],
    actual_response_code integer,
    expected_response_code integer,
    details varchar,
    CONSTRAINT namespace_security_check_result_pkey PRIMARY KEY (
        process_id, service_id, method, path
    ),
    CONSTRAINT namespace_security_check_result_process_id_fk FOREIGN KEY (
        process_id
    ) REFERENCES namespace_security_check (process_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS namespace_security_check_service
(
    process_id varchar NOT NULL,
    service_id varchar,
    apihub_url varchar,
    package_id varchar,
    version varchar,
    endpoints_total integer,
    endpoints_failed integer,
    status varchar,
    details varchar,
    CONSTRAINT namespace_security_check_service_pkey PRIMARY KEY (
        process_id, service_id
    ),
    CONSTRAINT namespace_security_check_service_process_id_fk FOREIGN KEY (
        process_id
    ) REFERENCES namespace_security_check (process_id) ON DELETE CASCADE
);
