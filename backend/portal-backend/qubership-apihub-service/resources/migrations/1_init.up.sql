-- noinspection SqlNoDataSourceInspectionForFile
-- schema downgrade file
-- dropping existing functions
DROP FUNCTION IF EXISTS public.get_latest_revision CASCADE;
DROP FUNCTION IF EXISTS public.merge_json_path CASCADE;
DROP FUNCTION IF EXISTS public.parent_package_names CASCADE;
DROP FUNCTION IF EXISTS public.split_json_path CASCADE;
DROP FUNCTION IF EXISTS parent_package_names CASCADE;
DROP FUNCTION IF EXISTS merge_json_path CASCADE;

-- dropping existing indexes
DROP INDEX IF EXISTS  ts_published_data_custom_split_idx CASCADE;
DROP INDEX IF EXISTS  ts_operation_data_idx  CASCADE;
DROP INDEX IF EXISTS  build_depends_index  CASCADE;
DROP INDEX IF EXISTS  ts_operation_data_idx  CASCADE;
DROP INDEX IF EXISTS  ts_graphql_operation_data_idx CASCADE;
DROP INDEX IF EXISTS  activity_tracking_transition_id_uindex CASCADE;
DROP INDEX IF EXISTS  package_transition_old_package_id_index  CASCADE;
DROP INDEX IF EXISTS  ts_published_data_path_split_idx  CASCADE;
DROP INDEX IF EXISTS  ts_published_data_custom_split_idx CASCADE;
DROP INDEX IF EXISTS  activity_tracking_transition_id_uindex CASCADE;
DROP INDEX IF EXISTS  build_depends_index  CASCADE;
DROP INDEX IF EXISTS  build_status_index  CASCADE;
DROP INDEX IF EXISTS  operation_comparison_comparison_id_index  CASCADE;
DROP INDEX IF EXISTS  package_transition_old_package_id_index  CASCADE;
DROP INDEX IF EXISTS  published_sources_package_id_version_revision_uindex CASCADE;
DROP INDEX IF EXISTS  ts_graphql_operation_data_idx  CASCADE;
DROP INDEX IF EXISTS  ts_operation_data_idx  CASCADE;
DROP INDEX IF EXISTS  ts_rest_operation_data_idx  CASCADE;

-- dropping existing sequences
DROP SEQUENCE IF EXISTS public.activity_tracking_transition_completed_seq CASCADE;
DROP SEQUENCE IF EXISTS activity_tracking_transition_completed_seq CASCADE;

-- dropping existing tables
DROP TABLE IF EXISTS public.activity_tracking CASCADE;
DROP TABLE IF EXISTS public.activity_tracking_transition CASCADE;
DROP TABLE IF EXISTS public.agent CASCADE;
DROP TABLE IF EXISTS public.agent_config CASCADE;
DROP TABLE IF EXISTS public.apihub_api_keys CASCADE;
DROP TABLE IF EXISTS public.branch_draft_content CASCADE;
DROP TABLE IF EXISTS public.branch_draft_reference CASCADE;
DROP TABLE IF EXISTS public.build CASCADE;
DROP TABLE IF EXISTS public.build_cleanup_run CASCADE;
DROP TABLE IF EXISTS public.build_depends CASCADE;
DROP TABLE IF EXISTS public.build_result CASCADE;
DROP TABLE IF EXISTS public.build_src CASCADE;
DROP TABLE IF EXISTS public.builder_notifications CASCADE;
DROP TABLE IF EXISTS public.business_metric CASCADE;
DROP TABLE IF EXISTS public.drafted_branches CASCADE;
DROP TABLE IF EXISTS public.endpoint_calls CASCADE;
DROP TABLE IF EXISTS public.external_identity CASCADE;
DROP TABLE IF EXISTS public.favorite_packages CASCADE;
DROP TABLE IF EXISTS public.favorite_projects CASCADE;
DROP TABLE IF EXISTS public.grouped_operation CASCADE;
DROP TABLE IF EXISTS public.migrated_version CASCADE;
DROP TABLE IF EXISTS public.migrated_version_changes CASCADE;
DROP TABLE IF EXISTS public.migration_changes CASCADE;
DROP TABLE IF EXISTS public.migration_run CASCADE;
DROP TABLE IF EXISTS public.operation CASCADE;
DROP TABLE IF EXISTS public.operation_comparison CASCADE;
DROP TABLE IF EXISTS public.operation_data CASCADE;
DROP TABLE IF EXISTS public.operation_group CASCADE;
DROP TABLE IF EXISTS public.operation_group_history CASCADE;
DROP TABLE IF EXISTS public.operation_group_publication CASCADE;
DROP TABLE IF EXISTS public.operation_group_template CASCADE;
DROP TABLE IF EXISTS public.operation_open_count CASCADE;
DROP TABLE IF EXISTS public.package_group CASCADE;
DROP TABLE IF EXISTS public.package_member_role CASCADE;
DROP TABLE IF EXISTS public.package_service CASCADE;
DROP TABLE IF EXISTS public.package_transition CASCADE;
DROP TABLE IF EXISTS public.project CASCADE;
DROP TABLE IF EXISTS public.published_content_messages CASCADE;
DROP TABLE IF EXISTS public.published_data CASCADE;
DROP TABLE IF EXISTS public.published_document_open_count CASCADE;
DROP TABLE IF EXISTS public.published_sources CASCADE;
DROP TABLE IF EXISTS public.published_sources_archives CASCADE;
DROP TABLE IF EXISTS public.published_version CASCADE;
DROP TABLE IF EXISTS public.published_version_open_count CASCADE;
DROP TABLE IF EXISTS public.published_version_reference CASCADE;
DROP TABLE IF EXISTS public.published_version_revision_content CASCADE;
DROP TABLE IF EXISTS public.published_version_validation CASCADE;
DROP TABLE IF EXISTS public.role CASCADE;
DROP TABLE IF EXISTS public.shared_url_info CASCADE;
DROP TABLE IF EXISTS public.system_role CASCADE;
DROP TABLE IF EXISTS public.transformed_content_data CASCADE;
DROP TABLE IF EXISTS public.ts_graphql_operation_data CASCADE;
DROP TABLE IF EXISTS public.ts_operation_data CASCADE;
DROP TABLE IF EXISTS public.ts_rest_operation_data CASCADE;
DROP TABLE IF EXISTS public.user_avatar_data CASCADE;
DROP TABLE IF EXISTS public.user_data CASCADE;
DROP TABLE IF EXISTS public.user_integration CASCADE;
DROP TABLE IF EXISTS public.version_comparison CASCADE;
DROP TABLE IF EXISTS public.versions_cleanup_run CASCADE;
DROP TABLE IF EXISTS branch_draft_content CASCADE;
DROP TABLE IF EXISTS branch_draft_reference CASCADE;
DROP TABLE IF EXISTS project CASCADE;
DROP TABLE IF EXISTS published_data CASCADE;
DROP TABLE IF EXISTS published_version CASCADE;
DROP TABLE IF EXISTS published_version_reference CASCADE;
DROP TABLE IF EXISTS published_version_revision_content CASCADE;
DROP TABLE IF EXISTS user_data CASCADE;
DROP TABLE IF EXISTS user_integration CASCADE;
DROP TABLE IF EXISTS favorite_projects CASCADE;
DROP TABLE IF EXISTS published_content_messages CASCADE;
DROP TABLE IF EXISTS shared_url_info CASCADE;
DROP TABLE IF EXISTS published_sources_data CASCADE;
DROP TABLE IF EXISTS drafted_branches CASCADE;
DROP TABLE IF EXISTS package_group CASCADE;
DROP TABLE IF EXISTS ts_published_data_custom_split CASCADE;
DROP TABLE IF EXISTS ts_published_data_errors CASCADE;
DROP TABLE IF EXISTS build_src CASCADE;
DROP TABLE IF EXISTS build_depends CASCADE;
DROP TABLE IF EXISTS package_member_role CASCADE;
DROP TABLE IF EXISTS operation CASCADE;
DROP TABLE IF EXISTS operation_data CASCADE;
DROP TABLE IF EXISTS changed_operation CASCADE;
DROP TABLE IF EXISTS published_document_open_count  CASCADE;
DROP TABLE IF EXISTS operation_open_count  CASCADE;
DROP TABLE IF EXISTS published_sources_data CASCADE;
DROP TABLE IF EXISTS role  CASCADE;
DROP TABLE IF EXISTS favorite_projects CASCADE;
DROP TABLE IF EXISTS favorite_packages CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS operation_group  CASCADE;
DROP TABLE IF EXISTS grouped_operation CASCADE;
DROP TABLE IF EXISTS operations_group  CASCADE;
DROP TABLE IF EXISTS ts_operation_data CASCADE;
DROP TABLE IF EXISTS ts_graphql_operation_data CASCADE;
DROP TABLE IF EXISTS migration_changes CASCADE;
DROP TABLE IF EXISTS ts_published_data_custom_split CASCADE;
DROP TABLE IF EXISTS ts_published_data_errors CASCADE;
DROP TABLE IF EXISTS csv_dashboard_publication CASCADE;

-- maintain schema migration tables
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    "version" int4 NOT NULL,
    dirty bool NOT NULL,
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);

CREATE TABLE IF NOT EXISTS public.stored_schema_migration (
    num int4 NOT NULL,
    up_hash varchar NOT NULL,
    sql_up varchar NOT NULL,
    down_hash varchar NULL,
    sql_down varchar NULL,
    CONSTRAINT stored_schema_migration_pkey PRIMARY KEY (num)
);

-- remove all the previous migrations
truncate table public.stored_schema_migration;
truncate table public.schema_migrations;

CREATE OR REPLACE FUNCTION public.get_latest_revision(package_id character varying, version character varying) RETURNS integer
    LANGUAGE plpgsql
AS $_$
declare
    latest_revision integer;
begin
    execute '
     select max(revision)
     from published_version
     where package_id = $1 and version = $2;'
     into latest_revision
     using package_id,version;
    if latest_revision is null then return 0;
    end if;
    return latest_revision;
end;$_$;



--
-- TOC entry 264 (class 1255 OID 17274)
-- Name: merge_json_path(jsonb[]); Type: FUNCTION; Schema: public; Owner: apihub
--

CREATE OR REPLACE FUNCTION public.merge_json_path(jsonb[]) RETURNS jsonb[]
    LANGUAGE plpgsql STRICT
AS $_$
declare
    items alias for $1;
    jsonpath text;
    ret jsonb[];
begin
    for i in array_lower(items, 1)..array_upper(items, 1) loop
    select string_agg(el, '/') into jsonpath from jsonb_array_elements_text(items[i]->'jsonPath') el;
    ret[i] := jsonb_set(items[i], '{jsonPath}', to_jsonb(jsonpath), false);
     end loop;
    return ret;
end;
$_$;



--
-- TOC entry 262 (class 1255 OID 17011)
-- Name: parent_package_names(character varying); Type: FUNCTION; Schema: public; Owner: apihub
--

CREATE OR REPLACE FUNCTION public.parent_package_names(character varying) RETURNS character varying[]
    LANGUAGE plpgsql
AS $_$
declare
    split varchar[] := string_to_array($1, '.')::varchar[];
    parent_ids varchar[];
    parent_names varchar[];
begin

    if coalesce(array_length(split, 1), 0) <= 1 then
     return ARRAY[]::varchar[];
    end if;

    parent_ids = parent_ids || split[1];

    for i in 2..(array_length(split, 1) - 1)
     loop
    parent_ids = parent_ids || (parent_ids[i-1] ||'.'|| split[i])::character varying;
     end loop;

    execute '
select array_agg(name) from (
  select name from package_group
  join unnest($1) with ordinality t(id, ord) using (id) --sort by parent_ids array
  order by t.ord) n'
     into parent_names
     using parent_ids;

    return parent_names;

end;
$_$;



--
-- TOC entry 263 (class 1255 OID 17273)
-- Name: split_json_path(jsonb[]); Type: FUNCTION; Schema: public; Owner: apihub
--

CREATE OR REPLACE FUNCTION public.split_json_path(jsonb[]) RETURNS jsonb[]
    LANGUAGE plpgsql STRICT
AS $_$
declare
    items alias for $1;
    ret jsonb[];
begin
    for i in array_lower(items, 1)..array_upper(items, 1)
     loop
    ret[i] := jsonb_set(items[i], '{jsonPath}',
    (array_to_json(string_to_array(trim(both '"' from (items[i] -> 'jsonPath')::text),
    '/')))::jsonb, false);
     end loop;
    return ret;
end;
$_$;



SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE IF NOT EXISTS public.package_group (
    id character varying NOT NULL,
    kind character varying,
    name character varying,
    alias character varying,
    parent_id character varying,
    image_url character varying,
    description text,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone,
    created_by character varying,
    deleted_by character varying,
    default_role character varying DEFAULT 'Viewer'::character varying NOT NULL,
    default_released_version character varying,
    service_name character varying,
    release_version_pattern character varying,
    exclude_from_search boolean DEFAULT false,
    rest_grouping_prefix character varying,
    CONSTRAINT "PK_project_group" PRIMARY KEY (id),
    CONSTRAINT "FK_parent_package_group" FOREIGN KEY (parent_id) REFERENCES public.package_group(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.activity_tracking (
    id character varying NOT NULL,
    e_type character varying NOT NULL,
    data jsonb,
    package_id character varying,
    date timestamp without time zone,
    user_id character varying,
    CONSTRAINT activity_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT activity_tracking_package_group_id_fk FOREIGN KEY (package_id) REFERENCES public.package_group(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.activity_tracking_transition (
    id character varying NOT NULL,
    tr_type character varying NOT NULL,
    from_id character varying NOT NULL,
    to_id character varying NOT NULL,
    status character varying NOT NULL,
    details character varying,
    started_by character varying NOT NULL,
    started_at timestamp without time zone NOT NULL,
    finished_at timestamp without time zone,
    progress_percent integer,
    affected_objects integer,
    completed_serial_number integer,
    CONSTRAINT activity_tracking_transition_pk PRIMARY KEY (id)
);

-- create if not exists
CREATE SEQUENCE IF NOT EXISTS public.activity_tracking_transition_completed_seq
    AS integer
    START WITH 0
    INCREMENT BY 1
    MINVALUE 0
    NO MAXVALUE
    CACHE 1;

-- reset the value if exists
SELECT pg_catalog.setval('public.activity_tracking_transition_completed_seq', 0, false);

-- alter ownership
ALTER SEQUENCE public.activity_tracking_transition_completed_seq OWNED BY public.activity_tracking_transition.completed_serial_number;

CREATE TABLE IF NOT EXISTS public.agent (
    agent_id character varying NOT NULL,
    cloud character varying NOT NULL,
    namespace character varying NOT NULL,
    url character varying NOT NULL,
    last_active timestamp without time zone NOT NULL,
    backend_version character varying NOT NULL,
    name character varying,
    agent_version character varying,
    CONSTRAINT agent_pkey PRIMARY KEY (agent_id)
);

CREATE TABLE IF NOT EXISTS public.agent_config (
    cloud character varying NOT NULL,
    namespace character varying NOT NULL,
    config jsonb,
    CONSTRAINT "PK_agent_config" PRIMARY KEY (cloud, namespace)
);

CREATE TABLE IF NOT EXISTS public.apihub_api_keys (
     id character varying NOT NULL,
     package_id character varying NOT NULL,
     name character varying NOT NULL,
     created_by character varying NOT NULL,
     created_at timestamp without time zone NOT NULL,
     deleted_by character varying,
     deleted_at timestamp without time zone,
     api_key character varying NOT NULL,
     roles character varying[] DEFAULT '{}'::character varying[],
     created_for character varying,
     CONSTRAINT apihub_api_keys_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.project (
     id character varying NOT NULL,
     name character varying NOT NULL,
     alias character varying NOT NULL,
     group_id character varying,
     description text,
     integration_type character varying,
     default_branch character varying,
     default_folder character varying,
     repository_id character varying,
     deleted_at timestamp without time zone,
     repository_name character varying,
     repository_url character varying,
     deleted_by character varying,
     package_id character varying,
     secret_token character varying,
     secret_token_user_id character varying,
     CONSTRAINT "PK_project" PRIMARY KEY (id)
);
COMMENT ON COLUMN public.project.group_id IS 'Only for the GROUP kind';
COMMENT ON COLUMN public.project.integration_type IS 'GitLab / Local storage';

CREATE TABLE IF NOT EXISTS public.branch_draft_content (
    project_id character varying NOT NULL,
    branch_name character varying NOT NULL,
    index integer DEFAULT 0 NOT NULL,
    name character varying,
    file_id character varying NOT NULL,
    path character varying,
    data_type character varying,
    data bytea,
    media_type character varying NOT NULL,
    status character varying,
    moved_from character varying,
    commit_id character varying,
    publish boolean,
    labels character varying[],
    last_status character varying,
    conflicted_commit_id character varying,
    conflicted_file_id character varying,
    included boolean DEFAULT false,
    is_folder boolean,
    from_folder boolean,
    blob_id character varying,
    conflicted_blob_id character varying,
    CONSTRAINT "PK_branch_draft_content" PRIMARY KEY (project_id, branch_name, file_id),
    CONSTRAINT "FK_project" FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE ON UPDATE CASCADE
);
COMMENT ON COLUMN public.branch_draft_content.data_type IS 'OpenAPI / Swagger / MD';
COMMENT ON COLUMN public.branch_draft_content.media_type IS 'HTTP media-type';


CREATE TABLE IF NOT EXISTS public.branch_draft_reference (
    project_id character varying NOT NULL,
    branch_name character varying NOT NULL,
    reference_package_id character varying NOT NULL,
    reference_version character varying NOT NULL,
    status character varying,
    CONSTRAINT "PK_branch_draft_reference" PRIMARY KEY (branch_name, project_id, reference_package_id, reference_version),
    CONSTRAINT "FK_project" FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.build (
    build_id character varying NOT NULL,
    status character varying NOT NULL,
    details character varying,
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    last_active timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying NOT NULL,
    restart_count integer,
    client_build boolean,
    started_at timestamp without time zone,
    builder_id character varying,
    priority integer DEFAULT 0 NOT NULL,
    metadata jsonb,
    CONSTRAINT "PK_build" PRIMARY KEY (build_id),
    CONSTRAINT build_package_group_id_fk FOREIGN KEY (package_id) REFERENCES public.package_group(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.build_cleanup_run (
    run_id integer NOT NULL,
    scheduled_at timestamp without time zone,
    deleted_rows integer,
    build_result integer DEFAULT 0,
    build_src integer DEFAULT 0,
    operation_data integer DEFAULT 0,
    ts_operation_data integer DEFAULT 0,
    ts_rest_operation_data integer DEFAULT 0,
    ts_gql_operation_data integer DEFAULT 0,
    CONSTRAINT build_cleanup_run_pkey PRIMARY KEY (run_id)
);

CREATE TABLE IF NOT EXISTS public.build_depends (
    build_id character varying NOT NULL,
    depend_id character varying NOT NULL,
    CONSTRAINT "FK_build_depends_depend" FOREIGN KEY (depend_id) REFERENCES public.build(build_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FK_build_depends_id" FOREIGN KEY (build_id) REFERENCES public.build(build_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.build_result (
    build_id character varying NOT NULL,
    data bytea NOT NULL,
    CONSTRAINT "FK_build_result_build_id" FOREIGN KEY (build_id) REFERENCES public.build(build_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.build_src (
    build_id character varying NOT NULL,
    source bytea,
    config jsonb NOT NULL,
    CONSTRAINT "FK_build_src" FOREIGN KEY (build_id) REFERENCES public.build(build_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.builder_notifications (
     build_id character varying NOT NULL,
     severity character varying,
     message character varying,
     file_id character varying,
     CONSTRAINT builder_notifications_build_id_fkey FOREIGN KEY (build_id) REFERENCES public.build(build_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.business_metric (
     year integer NOT NULL,
     month integer NOT NULL,
     day integer NOT NULL,
     metric character varying NOT NULL,
     data jsonb,
     user_id character varying DEFAULT 'unknown'::character varying NOT NULL,
     CONSTRAINT business_metric_pkey PRIMARY KEY (year, month, day, metric, user_id)
);

CREATE TABLE IF NOT EXISTS public.drafted_branches (
    project_id character varying NOT NULL,
    branch_name character varying NOT NULL,
    change_type character varying,
    original_config bytea,
    editors character varying[],
    commit_id character varying,
    CONSTRAINT drafted_branches_pkey PRIMARY KEY (project_id, branch_name),
    CONSTRAINT "FK_project" FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.endpoint_calls (
     path character varying NOT NULL,
     hash character varying NOT NULL,
     options jsonb,
     count integer,
     CONSTRAINT endpoint_calls_pkey PRIMARY KEY (path, hash)
);

CREATE TABLE IF NOT EXISTS public.user_data (
    user_id character varying NOT NULL,
    email character varying,
    name character varying,
    avatar_url character varying,
    password bytea,
    private_package_id character varying DEFAULT ''::character varying NOT NULL,
    CONSTRAINT "PK_user_data" PRIMARY KEY (user_id),
    CONSTRAINT email_unique UNIQUE (email),
    CONSTRAINT private_package_id_unique UNIQUE (private_package_id)
);

CREATE TABLE IF NOT EXISTS public.external_identity (
    provider character varying NOT NULL,
    external_id character varying NOT NULL,
    internal_id character varying NOT NULL,
    CONSTRAINT external_identity_pkey PRIMARY KEY (provider, external_id),
    CONSTRAINT "FK_user_data" FOREIGN KEY (internal_id) REFERENCES public.user_data(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.favorite_packages (
    user_id character varying NOT NULL,
    package_id character varying NOT NULL,
    CONSTRAINT "PK_favorite_packages" PRIMARY KEY (user_id, package_id),
    CONSTRAINT "FK_favorite_packages_package_group" FOREIGN KEY (package_id) REFERENCES public.package_group(id) ON DELETE CASCADE,
    CONSTRAINT "FK_favorite_packages_user_data" FOREIGN KEY (user_id) REFERENCES public.user_data(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.favorite_projects (
    user_id character varying NOT NULL,
    project_id character varying NOT NULL,
    CONSTRAINT "PK_favorite_projects" PRIMARY KEY (user_id, project_id),
    CONSTRAINT "FK_favorite_projects_project" FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE,
    CONSTRAINT "FK_favorite_projects_user_data" FOREIGN KEY (user_id) REFERENCES public.user_data(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.migrated_version (
    package_id character varying,
    version character varying,
    revision integer,
    error character varying,
    build_id character varying,
    migration_id character varying,
    build_type character varying,
    no_changelog boolean,
    CONSTRAINT migrated_version_package_group_id_fk FOREIGN KEY (package_id) REFERENCES public.package_group(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.migrated_version_changes (
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    revision character varying NOT NULL,
    build_id character varying NOT NULL,
    migration_id character varying NOT NULL,
    changes jsonb,
    unique_changes character varying[]
);

CREATE TABLE IF NOT EXISTS public.migration_changes (
    migration_id character varying NOT NULL,
    changes jsonb,
    CONSTRAINT migration_changes_pkey PRIMARY KEY (migration_id)
);

CREATE TABLE IF NOT EXISTS public.migration_run (
    id character varying,
    started_at timestamp without time zone,
    status character varying,
    stage character varying,
    package_ids character varying[],
    versions character varying[],
    is_rebuild boolean,
    is_rebuild_changelog_only boolean,
    current_builder_version character varying,
    error_details character varying,
    finished_at timestamp without time zone,
    updated_at timestamp without time zone,
    skip_validation boolean
);

CREATE TABLE IF NOT EXISTS public.operation_data (
     data_hash character varying NOT NULL,
     data bytea,
     search_scope jsonb,
     CONSTRAINT pk_operation_data PRIMARY KEY (data_hash)
);

CREATE TABLE IF NOT EXISTS public.published_version (
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    revision integer NOT NULL,
    status character varying NOT NULL,
    published_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone,
    metadata jsonb,
    previous_version character varying,
    previous_version_package_id character varying,
    labels character varying[],
    created_by character varying,
    deleted_by character varying,
    CONSTRAINT "PK_published_version" PRIMARY KEY (package_id, version, revision),
    CONSTRAINT "FK_package_group" FOREIGN KEY (package_id) REFERENCES public.package_group(id) ON DELETE CASCADE ON UPDATE CASCADE
);
COMMENT ON COLUMN public.published_version.status IS 'DRAFT / APPROVED / RELEASED / ARCHIVE';

CREATE TABLE IF NOT EXISTS public.operation (
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    revision integer NOT NULL,
    operation_id character varying NOT NULL,
    data_hash character varying NOT NULL,
    deprecated boolean NOT NULL,
    kind character varying,
    title character varying,
    metadata jsonb,
    type character varying NOT NULL,
    deprecated_info varchar,
    deprecated_items jsonb,
    previous_release_versions character varying[],
    models jsonb,
    custom_tags jsonb,
    api_audience character varying DEFAULT 'external'::character varying,
    CONSTRAINT pk_operation PRIMARY KEY (package_id, version, revision, operation_id),
    CONSTRAINT "FK_operation_data" FOREIGN KEY (data_hash) REFERENCES public.operation_data(data_hash) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FK_published_version" FOREIGN KEY (package_id,"version",revision) REFERENCES public.published_version(package_id,"version",revision) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.version_comparison (
     package_id character varying NOT NULL,
     version character varying NOT NULL,
     revision integer NOT NULL,
     previous_package_id character varying NOT NULL,
     previous_version character varying NOT NULL,
     previous_revision integer NOT NULL,
     comparison_id character varying NOT NULL,
     operation_types jsonb,
     refs character varying[],
     open_count bigint NOT NULL,
     last_active timestamp without time zone NOT NULL,
     no_content boolean NOT NULL,
     builder_version character varying,
     CONSTRAINT version_comparison_comparison_id_key UNIQUE (comparison_id),
     CONSTRAINT version_comparison_pkey PRIMARY KEY (package_id, version, revision, previous_package_id, previous_version, previous_revision)
);

CREATE TABLE IF NOT EXISTS public.operation_comparison (
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    revision integer NOT NULL,
    previous_package_id character varying NOT NULL,
    previous_version character varying NOT NULL,
    previous_revision integer NOT NULL,
    operation_id character varying NOT NULL,
    data_hash character varying,
    previous_data_hash character varying,
    changes_summary jsonb,
    changes jsonb,
    comparison_id character varying,
    CONSTRAINT "FK_version_comparison" FOREIGN KEY (comparison_id) REFERENCES public.version_comparison(comparison_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.operation_group (
     package_id character varying NOT NULL,
     version character varying NOT NULL,
     revision integer NOT NULL,
     api_type character varying NOT NULL,
     group_name character varying NOT NULL,
     autogenerated boolean NOT NULL,
     group_id character varying NOT NULL,
     description character varying,
     template_checksum character varying,
     template_filename character varying,
     CONSTRAINT operation_group_group_id_key UNIQUE (group_id),
     CONSTRAINT operation_group_pkey PRIMARY KEY (package_id, version, revision, api_type, group_name),
     CONSTRAINT "FK_published_version" FOREIGN KEY (package_id,"version",revision) REFERENCES public.published_version(package_id,"version",revision) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.grouped_operation (
    group_id character varying NOT NULL,
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    revision integer NOT NULL,
    operation_id character varying NOT NULL,
    CONSTRAINT "FK_operation" FOREIGN KEY (package_id,"version",revision,operation_id) REFERENCES public.operation(package_id,"version",revision,operation_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FK_operation_group" FOREIGN KEY (group_id) REFERENCES public.operation_group(group_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.operation_group_history (
     group_id character varying,
     action character varying,
     data jsonb,
     user_id character varying,
     date timestamp without time zone,
     automatic boolean
);

CREATE TABLE IF NOT EXISTS public.operation_group_publication (
    publish_id character varying NOT NULL,
    status character varying,
    details character varying,
    CONSTRAINT operation_group_publication_pkey PRIMARY KEY (publish_id)
);

CREATE TABLE IF NOT EXISTS public.operation_group_template (
    checksum character varying NOT NULL,
    template bytea,
    CONSTRAINT operation_group_template_pkey PRIMARY KEY (checksum)
);

CREATE TABLE IF NOT EXISTS public.operation_open_count (
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    operation_id character varying NOT NULL,
    open_count bigint,
    CONSTRAINT operation_open_count_pkey PRIMARY KEY (package_id, version, operation_id)
);

CREATE TABLE IF NOT EXISTS public.package_member_role (
    user_id character varying NOT NULL,
    package_id character varying NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_by character varying,
    updated_at timestamp without time zone,
    roles character varying[] DEFAULT '{}'::character varying[],
    CONSTRAINT "PK_package_member_role" PRIMARY KEY (package_id, user_id),
    CONSTRAINT "FK_package_group" FOREIGN KEY (package_id) REFERENCES public.package_group(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.package_service (
     package_id character varying NOT NULL,
     service_name character varying NOT NULL,
     workspace_id character varying NOT NULL,
     CONSTRAINT "PK_package_service" PRIMARY KEY (workspace_id, package_id, service_name),
     CONSTRAINT package_service_workspace_id_service_name_key UNIQUE (workspace_id, service_name),
     CONSTRAINT "FK_package_group" FOREIGN KEY (package_id) REFERENCES public.package_group(id) ON DELETE CASCADE ON UPDATE CASCADE,
     CONSTRAINT "FK_package_group_workspace" FOREIGN KEY (workspace_id) REFERENCES public.package_group(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.package_transition (
     old_package_id character varying NOT NULL,
     new_package_id character varying NOT NULL
);

CREATE TABLE IF NOT EXISTS public.published_content_messages (
     checksum character varying NOT NULL,
     messages jsonb,
     CONSTRAINT "PK_published_content_messages" PRIMARY KEY (checksum)
);

CREATE TABLE IF NOT EXISTS public.published_data (
     package_id character varying NOT NULL,
     checksum character varying NOT NULL,
     media_type character varying NOT NULL,
     data bytea NOT NULL,
     CONSTRAINT "PK_published_data" PRIMARY KEY (checksum, package_id),
     CONSTRAINT published_data_package_group_id_fk FOREIGN KEY (package_id) REFERENCES public.package_group(id) ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON COLUMN public.published_data.media_type IS 'HTTP media-type';

CREATE TABLE IF NOT EXISTS public.published_document_open_count (
     package_id character varying NOT NULL,
     version character varying NOT NULL,
     slug character varying NOT NULL,
     open_count bigint,
     CONSTRAINT published_document_open_count_pkey PRIMARY KEY (package_id, version, slug),
     CONSTRAINT published_document_open_count_package_group_id_fk FOREIGN KEY (package_id) REFERENCES public.package_group(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.published_sources (
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    revision integer NOT NULL,
    config bytea,
    metadata bytea,
    archive_checksum character varying,
    CONSTRAINT "FK_published_sources_version_revision" FOREIGN KEY (package_id,"version",revision) REFERENCES public.published_version(package_id,"version",revision) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.published_sources_archives (
     checksum character varying NOT NULL,
     data bytea,
     CONSTRAINT published_sources_archives_pk PRIMARY KEY (checksum)
);

CREATE TABLE IF NOT EXISTS public.published_version_open_count (
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    open_count bigint,
    CONSTRAINT published_version_open_count_pkey PRIMARY KEY (package_id, version),
    CONSTRAINT published_version_open_count_package_group_id_fk FOREIGN KEY (package_id) REFERENCES public.package_group(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.published_version_reference (
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    revision integer NOT NULL,
    reference_id character varying NOT NULL,
    reference_version character varying NOT NULL,
    reference_revision integer DEFAULT 0 NOT NULL,
    parent_reference_id character varying DEFAULT ''::character varying NOT NULL,
    parent_reference_version character varying DEFAULT ''::character varying NOT NULL,
    parent_reference_revision integer DEFAULT 0 NOT NULL,
    excluded boolean DEFAULT false,
    CONSTRAINT "PK_published_version_reference" PRIMARY KEY (package_id, version, revision, reference_id, reference_version, reference_revision, parent_reference_id, parent_reference_version, parent_reference_revision),
    CONSTRAINT "FK_published_version" FOREIGN KEY (package_id,"version",revision) REFERENCES public.published_version(package_id,"version",revision) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.published_version_revision_content (
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    revision integer NOT NULL,
    checksum character varying NOT NULL,
    index integer DEFAULT 0 NOT NULL,
    file_id character varying NOT NULL,
    path character varying,
    slug character varying NOT NULL,
    data_type character varying NOT NULL,
    name character varying NOT NULL,
    metadata jsonb,
    title character varying,
    format character varying,
    operation_ids character varying[],
    filename character varying,
    CONSTRAINT published_version_revision_content_pk PRIMARY KEY (package_id, version, revision, file_id),
    CONSTRAINT "FK_published_data" FOREIGN KEY (checksum,package_id) REFERENCES public.published_data(checksum,package_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FK_published_version_revision" FOREIGN KEY (package_id,"version",revision) REFERENCES public.published_version(package_id,"version",revision) ON DELETE CASCADE ON UPDATE CASCADE
);
COMMENT ON COLUMN public.published_version_revision_content.data_type IS 'OpenAPI / Swagger / MD';

CREATE TABLE IF NOT EXISTS public.published_version_validation (
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    revision integer NOT NULL,
    changelog jsonb,
    spectral jsonb,
    bwc jsonb,
    CONSTRAINT "PK_published_version_validation" PRIMARY KEY (package_id, version, revision),
    CONSTRAINT "FK_published_version_validation" FOREIGN KEY (package_id,"version",revision) REFERENCES public.published_version(package_id,"version",revision) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.role (
    id character varying NOT NULL,
    role character varying NOT NULL,
    rank integer NOT NULL,
    permissions character varying[],
    read_only boolean,
    CONSTRAINT role_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.shared_url_info (
     package_id character varying NOT NULL,
     version character varying NOT NULL,
     file_id character varying NOT NULL,
     shared_id character varying NOT NULL,
     CONSTRAINT "PK_shared_url_info" PRIMARY KEY (shared_id),
     CONSTRAINT shared_url_info__file_info UNIQUE (package_id, version, file_id),
     CONSTRAINT shared_url_info_package_group_id_fk FOREIGN KEY (package_id) REFERENCES public.package_group(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.system_role (
      user_id character varying NOT NULL,
      role character varying NOT NULL,
      CONSTRAINT "PK_system_role" PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS public.transformed_content_data (
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    revision integer NOT NULL,
    api_type character varying NOT NULL,
    group_id character varying NOT NULL,
    data bytea,
    documents_info jsonb,
    build_type character varying DEFAULT 'documentGroup'::character varying NOT NULL,
    format character varying DEFAULT 'json'::character varying NOT NULL,
    CONSTRAINT transformed_content_data_pkey PRIMARY KEY (package_id, version, revision, api_type, group_id, build_type, format),
    CONSTRAINT "FK_transformed_content_data_operation_group" FOREIGN KEY (group_id) REFERENCES public.operation_group(group_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.ts_graphql_operation_data (
    data_hash character varying NOT NULL,
    scope_argument tsvector,
    scope_property tsvector,
    scope_annotation tsvector,
    CONSTRAINT pk_ts_graphql_operation_data PRIMARY KEY (data_hash)
);

CREATE TABLE IF NOT EXISTS public.ts_operation_data (
    data_hash character varying NOT NULL,
    scope_all tsvector,
    CONSTRAINT pk_ts_operation_data PRIMARY KEY (data_hash)
);

CREATE TABLE IF NOT EXISTS public.ts_rest_operation_data (
    data_hash character varying NOT NULL,
    scope_request tsvector,
    scope_response tsvector,
    scope_annotation tsvector,
    scope_properties tsvector,
    scope_examples tsvector,
    CONSTRAINT pk_ts_rest_operation_data PRIMARY KEY (data_hash),
    CONSTRAINT "FK_operation_data" FOREIGN KEY (data_hash) REFERENCES public.operation_data(data_hash) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.user_avatar_data (
    user_id character varying NOT NULL,
    avatar bytea,
    checksum bytea,
    CONSTRAINT "PK_user_avatar_data" PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS public.user_integration (
    user_id character varying NOT NULL,
    integration_type character varying NOT NULL,
    key text,
    is_revoked boolean DEFAULT false,
    refresh_token character varying,
    expires_at timestamp without time zone,
    redirect_uri character varying,
    failed_refresh_attempts integer DEFAULT 0,
    CONSTRAINT "PK_user_integration" PRIMARY KEY (user_id, integration_type)
);
COMMENT ON COLUMN public.user_integration.integration_type IS 'GitLab';

CREATE TABLE IF NOT EXISTS public.versions_cleanup_run (
    run_id uuid NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    package_id character varying NOT NULL,
    delete_before timestamp without time zone NOT NULL,
    status character varying NOT NULL,
    details character varying,
    deleted_items integer,
    CONSTRAINT pk_versions_cleanup_run PRIMARY KEY (run_id),
    CONSTRAINT versions_cleanup_run_package_group_id_fk FOREIGN KEY (package_id) REFERENCES public.package_group(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.csv_dashboard_publication(
    publish_id varchar,
    status varchar,
    message varchar,
    csv_report bytea,
    PRIMARY KEY(publish_id)
);

-- initial data for ROLE table
INSERT INTO public.role VALUES ('admin', 'Admin', 1000, '{read,create_and_update_package,delete_package,manage_draft_version,manage_release_version,manage_archived_version,user_access_management,access_token_management}', true);
INSERT INTO public.role VALUES ('release-manager', 'Release Manager', 4, '{read,manage_release_version}', false);
INSERT INTO public.role VALUES ('owner', 'Owner', 3, '{read,create_and_update_package,delete_package,manage_draft_version,manage_release_version,manage_archived_version}', false);
INSERT INTO public.role VALUES ('viewer', 'Viewer', 1, '{read}', true);
INSERT INTO public.role VALUES ('none', 'None', 0, '{}', true);
INSERT INTO public.role VALUES ('editor', 'Editor', 2, '{read,manage_draft_version,manage_release_version,manage_archived_version}', false);


INSERT INTO public.schema_migrations VALUES (1, false);