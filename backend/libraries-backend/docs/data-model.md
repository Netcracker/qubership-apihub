# libraries-backend — data model

Status: implemented. The schema below is what
[`resources/migrations/1_init.up.sql`](../resources/migrations/1_init.up.sql) creates; read that file for the
authoritative definition and this one for the reasoning. The
[Deviations](#deviations-in-the-implemented-schema) section lists where the two differ on purpose.

This document describes the PostgreSQL schema of `libraries-backend`, the service that tracks external
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
- `build_id` doubles as the `publishId` the worker sees on
  `POST /api/v3/libraries/{libraryId}/java-publish/{publishId}/status`, matching the existing
  `build-task-consumer` pattern. The path was renamed from `packageId` when the service was implemented; see
  [backend-api.md](../../java-task-consumer/docs/backend-api.md).
- Metrics are not implemented; see [Resolved questions](#resolved-questions).

## Registries

`authHeaders` never lands in the database. A registry row is a pointer; credentials live in the service's
config/secret store, keyed by `registry.id`.

```sql
CREATE TABLE IF NOT EXISTS registry (
    id         character varying NOT NULL,
    type       character varying NOT NULL, -- 'artifactory' | 'nexus'
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
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- A partial unique index, not a UNIQUE constraint: a soft-deleted library must not keep its coordinates
-- reserved, or the same library could never be tracked again.
CREATE UNIQUE INDEX uq_library_repository_coordinates
    ON library (repository, coordinates_key)
    WHERE deleted_at IS NULL;
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

CREATE TABLE IF NOT EXISTS library_method_data (
    data_hash character varying NOT NULL,
    data      bytea NOT NULL, -- parameters, return type, thrown exceptions, annotations, javadoc
    CONSTRAINT pk_library_method_data PRIMARY KEY (data_hash)
);

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
    status        character varying NOT NULL, -- 'none' | 'running' | 'complete' | 'error'
    details       character varying,
    library_id    character varying NOT NULL,
    version       character varying NOT NULL,
    build_type    character varying NOT NULL, -- 'java-api-report' | 'java-api-diff' | 'java-upgrade-impact'
    created_at    timestamp without time zone DEFAULT now() NOT NULL,
    last_active   timestamp without time zone DEFAULT now() NOT NULL,
    created_by    character varying NOT NULL,
    restart_count integer DEFAULT 0 NOT NULL,
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

`search_vector` is built from `library.name`, `alias`, `description`, and `coordinates_key`. Class- and
method-level search use the equivalent tables, keyed by the entity they index:

```sql
CREATE TABLE IF NOT EXISTS library_class_search (
    library_id    character varying NOT NULL,
    version       character varying NOT NULL,
    class_id      character varying NOT NULL,
    search_vector tsvector NOT NULL,
    CONSTRAINT pk_library_class_search PRIMARY KEY (library_id, version, class_id),
    CONSTRAINT fk_library_class_search_class FOREIGN KEY (library_id, version, class_id)
        REFERENCES library_class(library_id, version, class_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS library_method_search (
    library_id    character varying NOT NULL,
    version       character varying NOT NULL,
    class_id      character varying NOT NULL,
    method_id     character varying NOT NULL,
    search_vector tsvector NOT NULL,
    CONSTRAINT pk_library_method_search PRIMARY KEY (library_id, version, class_id, method_id),
    CONSTRAINT fk_library_method_search_method FOREIGN KEY (library_id, version, class_id, method_id)
        REFERENCES library_method(library_id, version, class_id, method_id) ON DELETE CASCADE ON UPDATE CASCADE
);
```

Both carry a GIN index on `search_vector`, like `library_search`.

Every vector is built with the `simple` text-search configuration, and both the indexed text and the query text pass
through the same normalisation (`regexp_replace(..., '[^a-zA-Z0-9_]+', ' ', 'g')`, see `repository/common.go`). An
English stemmer would fold `Mapping` and `maps` into one token, and the default parser keeps `jackson-databind` and
`com.example.Foo` as single compound tokens, so a search for one segment would never match the whole name.

## Deviations in the implemented schema

The migration departs from the proposal above in four places, each deliberate:

- **`uq_library_repository_coordinates` is a partial unique index**, not a `UNIQUE` constraint, so soft-deleting a
  library frees its coordinates. A constraint cannot be partial.
- **`library_method_data` exists.** It was commented out in the proposal, but `library_method.data_hash` references
  it, so the table is required for the foreign key to resolve.
- **`build.status` has a fourth value, `none`**, for a queued build nobody has taken. The three values the proposal
  lists are what the worker reports; the queue needs a not-started state as well, matching `portal-backend`'s `build`.
- **`build.restart_count` is `DEFAULT 0 NOT NULL`.** The queue compares it against a limit on every poll, so a null
  would have to be handled on a hot path for no benefit.

Two columns are kept for shape but carry less meaning than in `portal-backend`:

- **`library_version_comparison.open_count`** equals the total number of changes. Nothing in this service reviews a
  change, so every change counts as open.
- **`library_class.modifiers` and `library_method.modifiers` stay null.** The jdiff report carries modifier changes
  only as prose in its `details` field, never as a list, so there is nothing to populate them from. The prose is kept
  in the content-addressed body.

Fields of a class have no normalised row: the data model has classes and methods only, so a `FIELD` entry is stored
inside the class body and a field-level change is recorded as a class-level change with the member named in
`details`. This keeps `method_id` meaning "a method of this class".

## Resolved questions

- **Metrics.** Not implemented, and no counters were added. `build` already records `created_at`, `started_at`,
  `last_active`, and `status` per build, which answers "when was this last built" without a new column. Revisit when
  a requirement names the metric it needs.
- **Database ownership.** `libraries-backend` has its own PostgreSQL database (`apihub_libraries`), so
  `parent_package_id`, `created_by`, and `user_id` stay plain `character varying` cross-service references.
