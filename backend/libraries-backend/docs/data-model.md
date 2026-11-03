# libraries-backend — data model

Status: proposed, not yet implemented. `backend/libraries-backend/` has no `go.mod` and no migrations; use the
`apihub-add-go-service` skill when the module is actually scaffolded.

This document proposes the PostgreSQL schema for `libraries-backend`, the planned service that tracks external
library registries (Maven, npm, Go modules) and serves Java build tasks to
[java-task-consumer](../../java-task-consumer/README.md). It follows the conventions already used in
`portal-backend`: `character varying` IDs, an internal `id` plus a human-friendly `alias`, soft delete via
`created_at`/`created_by`/`deleted_at`/`deleted_by`, JSONB for structured blobs, Postgres arrays for flat lists,
content-addressed storage for large diffable payloads, and `tsvector`/GIN indexes for search. See
[backend-api.md](../../java-task-consumer/docs/backend-api.md) for the HTTP contract this schema has to support,
and [pact-libraries-backend.md](../../java-task-consumer/docs/pact-libraries-backend.md) for the executable
contract.

## Assumptions

- `libraries-backend` runs its own PostgreSQL schema, separate from `portal-backend`'s database. `parent_package_id`,
  `created_by`, and `user_id` are therefore plain `character varying` cross-service references, not foreign keys.
- `library.parent_package_id` points at an existing `portal-backend` `package_group.id`, so a tracked library's
  docs surface under that package in the portal UI.
- Library content means the parsed build output: the list of classes and their nested methods, not a cached copy of
  the raw artifact (jar, npm tarball, Go module zip).
- Search stays scoped to this service; it does not federate with `portal-backend`'s existing package search.
- `build_id` doubles as the `publishId` the worker sees on `POST /api/v3/packages/{packageId}/java-publish/{publishId}/status`,
  matching the existing `build-task-consumer` pattern. Confirm this against the Pact file before cutting migrations.
- Metrics scope is undecided; see [Open questions](#open-questions).

## Registries

`authHeaders` never lands in the database. A registry row is a pointer; credentials live in the service's
config/secret store, keyed by `registry.id`.

```sql
CREATE TABLE IF NOT EXISTS registry (
    id         character varying NOT NULL,
    type       character varying NOT NULL, -- 'atrifactory' | 'nexus'
    base_url   character varying NOT NULL,
    name       character varying,
    created_at timestamp without time zone NOT NULL,
    created_by character varying NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by character varying,
    CONSTRAINT pk_registry PRIMARY KEY (id)
);
```

## Repositories

A repository groups libraries within one registry — for example a distinct Maven repository, a Go module host
path, or an npm registry scope. `repository` is the primary key itself; there is no separate surrogate ID. This
means repository names are unique across all registries, not just within one. If the same repository name needs to
exist under two different registries, this table needs a composite key instead.

```sql
CREATE TABLE IF NOT EXISTS repository (
    repository  character varying NOT NULL,
    registry_id character varying NOT NULL,
    CONSTRAINT pk_repository PRIMARY KEY (repository),
    CONSTRAINT fk_repository_registry FOREIGN KEY (registry_id) REFERENCES registry(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
```

## Libraries

Mirrors `package_group`: internal `id`, human-friendly `alias`, soft delete, `default_role`. `coordinates` is
JSONB because its shape depends on `language` (Maven GAV, Go module path, or npm package name). `coordinates_key` is
a normalised string the service computes on write (for example `groupId:artifactId` or the module path), so
uniqueness and indexing do not have to reach into JSONB.

```sql
CREATE TABLE IF NOT EXISTS library (
    id                 character varying NOT NULL,
    alias              character varying,
    name               character varying,
    description        text,
    language           character varying NOT NULL, -- 'java' | 'go' | 'js'
    repository         character varying NOT NULL,
    parent_package_id  character varying, -- portal-backend package_group.id, cross-service
    coordinates        jsonb NOT NULL,
    coordinates_key    character varying NOT NULL, -- app-computed, for lookup/uniqueness
    default_role       character varying DEFAULT 'Viewer' NOT NULL,
    created_at         timestamp without time zone NOT NULL,
    created_by         character varying NOT NULL,
    deleted_at         timestamp without time zone,
    deleted_by         character varying,
    CONSTRAINT pk_library PRIMARY KEY (id),
    CONSTRAINT fk_library_repository FOREIGN KEY (repository) REFERENCES repository(repository)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_library_repository_coordinates UNIQUE (repository, coordinates_key)
);
```

## Library versions

Mirrors `published_version`, minus `revision` — a library version is not republished under the same version
string, so there is no need for a revision counter. `labels` is an array; `metadata` is a free-form JSONB bag.

```sql
CREATE TABLE IF NOT EXISTS library_version (
    library_id       character varying NOT NULL,
    version          character varying NOT NULL,
    previous_version character varying,
    status           character varying NOT NULL, -- 'draft' | 'release' 
    labels           character varying[],
    metadata         jsonb,
    created_at       timestamp without time zone NOT NULL,
    created_by       character varying NOT NULL,
    deleted_at       timestamp without time zone,
    deleted_by       character varying,
    CONSTRAINT pk_library_version PRIMARY KEY (library_id, version),
    CONSTRAINT fk_library_version_library FOREIGN KEY (library_id) REFERENCES library(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
```

## Library content — classes and methods

Parsed build output, normalised down to classes and their nested methods, so the UI can filter and diff at that
granularity. This mirrors the `operation`/`operation_data` split already in `portal-backend`: a normalised row per
class or method for filtering, plus a content-addressed `data_hash` row holding the full parsed body. The hash lets
an unchanged class or method across two versions share one storage row instead of duplicating it.

```sql
CREATE TABLE IF NOT EXISTS library_class_data (
    data_hash    character varying NOT NULL,
    data         bytea NOT NULL, -- full parsed class: superclass, interfaces, annotations, fields, javadoc
    search_scope jsonb,
    CONSTRAINT pk_library_class_data PRIMARY KEY (data_hash)
);

CREATE TABLE IF NOT EXISTS library_class (
    library_id     character varying NOT NULL,
    version        character varying NOT NULL,
    class_id       character varying NOT NULL, -- stable id across versions, e.g. qualified name
    data_hash      character varying NOT NULL,
    kind           character varying NOT NULL, -- 'class' | 'interface' | 'enum' | 'annotation' | 'record'
    qualified_name character varying NOT NULL,
    package_name   character varying,
    modifiers      character varying[],
    deprecated     boolean NOT NULL DEFAULT false,
    CONSTRAINT pk_library_class PRIMARY KEY (library_id, version, class_id),
    CONSTRAINT fk_library_class_version FOREIGN KEY (library_id, version)
        REFERENCES library_version(library_id, version) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_library_class_data FOREIGN KEY (data_hash) REFERENCES library_class_data(data_hash)
        ON DELETE CASCADE ON UPDATE CASCADE
);

/*
CREATE TABLE IF NOT EXISTS library_method_data (
    data_hash character varying NOT NULL,
    data      bytea NOT NULL, -- parameters, return type, thrown exceptions, annotations, javadoc
    CONSTRAINT pk_library_method_data PRIMARY KEY (data_hash)
);
*/

CREATE TABLE IF NOT EXISTS library_method (
    library_id character varying NOT NULL,
    version    character varying NOT NULL,
    class_id   character varying NOT NULL,
    method_id  character varying NOT NULL, -- stable id, e.g. erased signature (name + param types)
    data_hash  character varying NOT NULL,
    name       character varying NOT NULL,
    signature  character varying NOT NULL, -- display signature
    modifiers  character varying[],
    deprecated boolean NOT NULL DEFAULT false,
    CONSTRAINT pk_library_method PRIMARY KEY (library_id, version, class_id, method_id),
    CONSTRAINT fk_library_method_class FOREIGN KEY (library_id, version, class_id)
        REFERENCES library_class(library_id, version, class_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_library_method_data FOREIGN KEY (data_hash) REFERENCES library_method_data(data_hash)
        ON DELETE CASCADE ON UPDATE CASCADE
);
```

## Version comparison and changes

`library_version_comparison` is the comparison job record, a direct mirror of `version_comparison`.
`library_version_changes` holds the individual diff entries that job produces, scoped to a class and, optionally,
one of its methods. `severity` reuses the breaking / non-breaking / annotation vocabulary `api-diff` already uses
elsewhere in this repository, so the UI and tooling stay consistent.

```sql
CREATE TABLE IF NOT EXISTS library_version_comparison (
    library_id          character varying NOT NULL,
    version              character varying NOT NULL,
    previous_library_id  character varying NOT NULL,
    previous_version     character varying NOT NULL,
    comparison_id        character varying NOT NULL,
    change_counts        jsonb, -- counts per change_type/severity
    open_count           bigint NOT NULL,
    last_active          timestamp without time zone NOT NULL,
    no_content           boolean NOT NULL,
    builder_version      character varying,
    CONSTRAINT pk_library_version_comparison PRIMARY KEY
        (library_id, version, previous_library_id, previous_version),
    CONSTRAINT uq_library_version_comparison_id UNIQUE (comparison_id)
);

CREATE TABLE IF NOT EXISTS library_version_changes (
    comparison_id character varying NOT NULL,
    change_id     character varying NOT NULL,
    class_id      character varying NOT NULL,
    method_id     character varying, -- null for a class-level change
    change_type   character varying NOT NULL, -- 'added' | 'removed' | 'changed' | 'deprecated'
    severity      character varying NOT NULL, -- 'breaking' | 'non-breaking' | 'annotation'
    description   text,
    details       jsonb, -- raw japicmp/jdeps entry: old/new signature, etc.
    CONSTRAINT pk_library_version_changes PRIMARY KEY (comparison_id, change_id),
    CONSTRAINT fk_library_version_changes_comparison FOREIGN KEY (comparison_id)
        REFERENCES library_version_comparison(comparison_id) ON DELETE CASCADE ON UPDATE CASCADE
);
```

## Build queue

Mirrors `build`/`build_result` in `portal-backend`, which is also what `java-task-consumer` already expects by
contract ([backend-api.md](../../java-task-consumer/docs/backend-api.md)): poll by `builderId`, post `status` with
`running` / `complete` / `error`.

```sql
CREATE TABLE IF NOT EXISTS build (
    build_id      character varying NOT NULL,
    status        character varying NOT NULL, -- 'running' | 'complete' | 'error'
    details       character varying,
    library_id    character varying NOT NULL,
    version       character varying NOT NULL,
    build_type    character varying NOT NULL, -- 'java-api-report' | 'java-api-diff' | 'java-upgrade-impact'
    created_at    timestamp without time zone DEFAULT now() NOT NULL,
    last_active   timestamp without time zone DEFAULT now() NOT NULL,
    created_by    character varying NOT NULL,
    restart_count integer,
    started_at    timestamp without time zone,
    builder_id    character varying,
    priority      integer DEFAULT 0 NOT NULL,
    metadata      jsonb, -- config.json metadata: gav / oldVersion+newVersion / subject+upgrades
    CONSTRAINT pk_build PRIMARY KEY (build_id),
    CONSTRAINT fk_build_library FOREIGN KEY (library_id) REFERENCES library(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS build_result (
    build_id character varying NOT NULL,
    data     bytea NOT NULL, -- report.json from the result ZIP
    CONSTRAINT pk_build_result PRIMARY KEY (build_id),
    CONSTRAINT fk_build_result_build FOREIGN KEY (build_id) REFERENCES build(build_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
```

## Favourites

Same two-column junction as `favorite_packages`.

```sql
CREATE TABLE IF NOT EXISTS favorite_libraries (
    user_id    character varying NOT NULL,
    library_id character varying NOT NULL,
    CONSTRAINT pk_favorite_libraries PRIMARY KEY (user_id, library_id),
    CONSTRAINT fk_favorite_libraries_library FOREIGN KEY (library_id) REFERENCES library(id) ON DELETE CASCADE
);
```

## Roles and permissions

`libraries-backend` has no local `role` table. It reuses `portal-backend`'s role catalogue (`Viewer` / `Editor` /
`Admin` and their permissions) instead of duplicating it, so the two systems stay consistent for a given user by
construction rather than by syncing two copies. `library_member_role` mirrors `package_member_role`: roles live in
an array column rather than one row per role, storing the role IDs `portal-backend` defines.

```sql
CREATE TABLE IF NOT EXISTS library_member_role (
    library_id character varying NOT NULL,
    user_id    character varying NOT NULL,
    roles      character varying[] DEFAULT '{}',
    created_at timestamp without time zone NOT NULL,
    created_by character varying NOT NULL,
    updated_at timestamp without time zone,
    updated_by character varying,
    CONSTRAINT pk_library_member_role PRIMARY KEY (library_id, user_id),
    CONSTRAINT fk_library_member_role_library FOREIGN KEY (library_id) REFERENCES library(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
```

## Search

A dedicated search table, not a column on `library` itself — the same shape `portal-backend` uses for operation
search (`fts_latest_release_operation_data`): a narrow table keyed by the searchable entity, holding a `tsvector`
and a GIN index on it. The application (re)builds the row's `search_vector` whenever the source fields change.

```sql
CREATE TABLE IF NOT EXISTS library_search (
    library_id    character varying NOT NULL,
    search_vector tsvector NOT NULL,
    CONSTRAINT pk_library_search PRIMARY KEY (library_id),
    CONSTRAINT fk_library_search_library FOREIGN KEY (library_id) REFERENCES library(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_library_search_vector ON library_search USING gin (search_vector);
```

`search_vector` is built from `library.name`, `alias`, `description`, and `coordinates_key`. Add the equivalent
`library_class_search` / `library_method_search` tables, keyed by `(library_id, version, class_id)` and
`(library_id, version, class_id, method_id)`, for class- and method-level search, not just library-level.

## Open questions

- **Metrics.** Scope is undecided. A likely lightweight shape is counters on `library`/`library_version`
  (`download_count`, `build_count`, `last_built_at`), updated by application logic rather than a time-series store.
  Revisit if a richer requirement shows up (for example per-day build counts).
- **Database ownership.** This document assumes `libraries-backend` gets its own PostgreSQL schema, consistent with
  it being scaffolded as a standalone module via the `apihub-add-go-service` skill. If it shares `portal-backend`'s
  database instead, `parent_package_id` and `user_id` become real foreign keys rather than cross-service
  references.
