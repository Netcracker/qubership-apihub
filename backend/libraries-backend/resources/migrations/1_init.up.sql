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

-------------------------------------------

-- A registry row is a pointer to an external artifact registry. Credentials never land here: the service
-- reads them from its own config, keyed by registry.id.
CREATE TABLE IF NOT EXISTS public.registry
(
    id varchar NOT NULL,
    type varchar NOT NULL, -- 'artifactory' | 'nexus'
    base_url varchar NOT NULL,
    name varchar,
    created_at timestamp without time zone NOT NULL,
    created_by varchar NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by varchar,
    CONSTRAINT pk_registry PRIMARY KEY (id)
);

-- A repository groups libraries within one registry: a Maven repository, a Go module host path, or an npm
-- scope. The name is the key, so it is unique across all registries, not only within one.
CREATE TABLE IF NOT EXISTS public.repository
(
    repository varchar NOT NULL,
    registry_id varchar NOT NULL,
    CONSTRAINT pk_repository PRIMARY KEY (repository),
    CONSTRAINT fk_repository_registry FOREIGN KEY (registry_id) REFERENCES public.registry (id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- coordinates is jsonb because its shape depends on language; coordinates_key is the normalised string the
-- service computes on write, so lookup and uniqueness do not have to reach into the document.
CREATE TABLE IF NOT EXISTS public.library
(
    id varchar NOT NULL,
    alias varchar,
    name varchar,
    description text,
    language varchar NOT NULL, -- 'java' | 'go' | 'js'
    repository varchar NOT NULL,
    parent_package_id varchar, -- portal-backend package_group.id, cross-service
    coordinates jsonb NOT NULL,
    coordinates_key varchar NOT NULL,
    default_role varchar DEFAULT 'Viewer' NOT NULL,
    created_at timestamp without time zone NOT NULL,
    created_by varchar NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by varchar,
    CONSTRAINT pk_library PRIMARY KEY (id),
    CONSTRAINT fk_library_repository FOREIGN KEY (repository) REFERENCES public.repository (repository)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- A partial index rather than a UNIQUE constraint: a soft-deleted library must not keep its coordinates
-- reserved, otherwise the same library can never be tracked again.
CREATE UNIQUE INDEX IF NOT EXISTS uq_library_repository_coordinates
    ON public.library (repository, coordinates_key)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_library_parent_package_id ON public.library (parent_package_id);

-- A library version is never republished under the same version string, so there is no revision counter.
CREATE TABLE IF NOT EXISTS public.library_version
(
    library_id varchar NOT NULL,
    version varchar NOT NULL,
    previous_version varchar,
    status varchar NOT NULL, -- 'draft' | 'release'
    labels varchar [],
    metadata jsonb,
    created_at timestamp without time zone NOT NULL,
    created_by varchar NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by varchar,
    CONSTRAINT pk_library_version PRIMARY KEY (library_id, version),
    CONSTRAINT fk_library_version_library FOREIGN KEY (library_id) REFERENCES public.library (id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Parsed build output, normalised to classes and their methods so the UI can filter and diff at that
-- granularity. data_hash is content-addressed, so a class unchanged between two versions shares one row.
CREATE TABLE IF NOT EXISTS public.library_class_data
(
    data_hash varchar NOT NULL,
    data bytea NOT NULL, -- full parsed class: kind, fields, annotations, japicmp details
    search_scope jsonb,
    CONSTRAINT pk_library_class_data PRIMARY KEY (data_hash)
);

CREATE TABLE IF NOT EXISTS public.library_class
(
    library_id varchar NOT NULL,
    version varchar NOT NULL,
    class_id varchar NOT NULL, -- stable across versions: the qualified name
    data_hash varchar NOT NULL,
    kind varchar NOT NULL, -- 'class' | 'interface' | 'enum' | 'annotation' | 'record'
    qualified_name varchar NOT NULL,
    package_name varchar,
    modifiers varchar [],
    deprecated boolean DEFAULT false NOT NULL,
    CONSTRAINT pk_library_class PRIMARY KEY (library_id, version, class_id),
    CONSTRAINT fk_library_class_version FOREIGN KEY (library_id, version)
        REFERENCES public.library_version (library_id, version) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_library_class_data FOREIGN KEY (data_hash) REFERENCES public.library_class_data (data_hash)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.library_method_data
(
    data_hash varchar NOT NULL,
    data bytea NOT NULL, -- parameters, return type, annotations, japicmp details
    CONSTRAINT pk_library_method_data PRIMARY KEY (data_hash)
);

CREATE TABLE IF NOT EXISTS public.library_method
(
    library_id varchar NOT NULL,
    version varchar NOT NULL,
    class_id varchar NOT NULL,
    method_id varchar NOT NULL, -- stable id: erased signature, name plus parameter types
    data_hash varchar NOT NULL,
    name varchar NOT NULL,
    signature varchar NOT NULL, -- display signature
    modifiers varchar [],
    deprecated boolean DEFAULT false NOT NULL,
    CONSTRAINT pk_library_method PRIMARY KEY (library_id, version, class_id, method_id),
    CONSTRAINT fk_library_method_class FOREIGN KEY (library_id, version, class_id)
        REFERENCES public.library_class (library_id, version, class_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_library_method_data FOREIGN KEY (data_hash) REFERENCES public.library_method_data (data_hash)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- The comparison job record. The key carries previous_library_id as well as previous_version, so a
-- comparison can cross libraries (an upgrade-impact diff), not only compare against its own predecessor.
CREATE TABLE IF NOT EXISTS public.library_version_comparison
(
    library_id varchar NOT NULL,
    version varchar NOT NULL,
    previous_library_id varchar NOT NULL,
    previous_version varchar NOT NULL,
    comparison_id varchar NOT NULL,
    change_counts jsonb, -- counts per change_type and severity
    open_count bigint NOT NULL,
    last_active timestamp without time zone NOT NULL,
    no_content boolean NOT NULL,
    builder_version varchar,
    CONSTRAINT pk_library_version_comparison PRIMARY KEY
        (library_id, version, previous_library_id, previous_version),
    CONSTRAINT uq_library_version_comparison_id UNIQUE (comparison_id)
);

CREATE TABLE IF NOT EXISTS public.library_version_changes
(
    comparison_id varchar NOT NULL,
    change_id varchar NOT NULL,
    class_id varchar NOT NULL,
    method_id varchar, -- null for a class-level change
    change_type varchar NOT NULL, -- 'added' | 'removed' | 'changed' | 'deprecated'
    severity varchar NOT NULL, -- 'breaking' | 'non-breaking' | 'annotation'
    description text,
    details jsonb, -- raw jdiff entry: old and new signature, japicmp codes
    CONSTRAINT pk_library_version_changes PRIMARY KEY (comparison_id, change_id),
    CONSTRAINT fk_library_version_changes_comparison FOREIGN KEY (comparison_id)
        REFERENCES public.library_version_comparison (comparison_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_library_version_changes_class
    ON public.library_version_changes (comparison_id, class_id);

-- The Java build queue. 'none' is internal to the queue; java-task-consumer only ever posts the other three.
CREATE TABLE IF NOT EXISTS public.build
(
    build_id varchar NOT NULL,
    status varchar NOT NULL, -- 'none' | 'running' | 'complete' | 'error'
    details varchar,
    library_id varchar NOT NULL,
    version varchar NOT NULL,
    build_type varchar NOT NULL, -- 'java-api-report' | 'java-api-diff' | 'java-upgrade-impact'
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    last_active timestamp without time zone DEFAULT now() NOT NULL,
    created_by varchar NOT NULL,
    restart_count integer DEFAULT 0 NOT NULL,
    started_at timestamp without time zone,
    builder_id varchar,
    priority integer DEFAULT 0 NOT NULL,
    metadata jsonb, -- the config.json metadata the worker receives
    CONSTRAINT pk_build PRIMARY KEY (build_id),
    CONSTRAINT fk_build_library FOREIGN KEY (library_id) REFERENCES public.library (id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Supports the queue poll, which orders free builds by priority and age.
CREATE INDEX IF NOT EXISTS idx_build_status_priority_created
    ON public.build (status, priority DESC, created_at);

CREATE INDEX IF NOT EXISTS idx_build_library_version ON public.build (library_id, version);

CREATE TABLE IF NOT EXISTS public.build_result
(
    build_id varchar NOT NULL,
    data bytea NOT NULL, -- report.json from the result ZIP
    CONSTRAINT pk_build_result PRIMARY KEY (build_id),
    CONSTRAINT fk_build_result_build FOREIGN KEY (build_id) REFERENCES public.build (build_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.favorite_libraries
(
    user_id varchar NOT NULL,
    library_id varchar NOT NULL,
    CONSTRAINT pk_favorite_libraries PRIMARY KEY (user_id, library_id),
    CONSTRAINT fk_favorite_libraries_library FOREIGN KEY (library_id) REFERENCES public.library (id)
        ON DELETE CASCADE
);

-- There is no local role table: the role catalogue is portal-backend's, so the two systems stay consistent
-- by construction. roles holds the role ids portal-backend defines.
CREATE TABLE IF NOT EXISTS public.library_member_role
(
    library_id varchar NOT NULL,
    user_id varchar NOT NULL,
    roles varchar [] DEFAULT '{}',
    created_at timestamp without time zone NOT NULL,
    created_by varchar NOT NULL,
    updated_at timestamp without time zone,
    updated_by varchar,
    CONSTRAINT pk_library_member_role PRIMARY KEY (library_id, user_id),
    CONSTRAINT fk_library_member_role_library FOREIGN KEY (library_id) REFERENCES public.library (id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Search lives in narrow tables keyed by the searchable entity, the shape portal-backend uses for
-- operation search. The service rebuilds a row's search_vector whenever the source fields change.
CREATE TABLE IF NOT EXISTS public.library_search
(
    library_id varchar NOT NULL,
    search_vector tsvector NOT NULL,
    CONSTRAINT pk_library_search PRIMARY KEY (library_id),
    CONSTRAINT fk_library_search_library FOREIGN KEY (library_id) REFERENCES public.library (id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_library_search_vector ON public.library_search USING gin (search_vector);

CREATE TABLE IF NOT EXISTS public.library_class_search
(
    library_id varchar NOT NULL,
    version varchar NOT NULL,
    class_id varchar NOT NULL,
    search_vector tsvector NOT NULL,
    CONSTRAINT pk_library_class_search PRIMARY KEY (library_id, version, class_id),
    CONSTRAINT fk_library_class_search_class FOREIGN KEY (library_id, version, class_id)
        REFERENCES public.library_class (library_id, version, class_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_library_class_search_vector
    ON public.library_class_search USING gin (search_vector);

CREATE TABLE IF NOT EXISTS public.library_method_search
(
    library_id varchar NOT NULL,
    version varchar NOT NULL,
    class_id varchar NOT NULL,
    method_id varchar NOT NULL,
    search_vector tsvector NOT NULL,
    CONSTRAINT pk_library_method_search PRIMARY KEY (library_id, version, class_id, method_id),
    CONSTRAINT fk_library_method_search_method FOREIGN KEY (library_id, version, class_id, method_id)
        REFERENCES public.library_method (library_id, version, class_id, method_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_library_method_search_vector
    ON public.library_method_search USING gin (search_vector);
