CREATE TABLE IF NOT EXISTS public.version_internal_document_data (
    hash varchar NOT NULL,
    data bytea,
    CONSTRAINT version_internal_document_data_pkey PRIMARY KEY (hash)
);

CREATE TABLE IF NOT EXISTS public.version_internal_document (
    package_id varchar NOT NULL,
    version varchar NOT NULL,
    revision integer NOT NULL,
    document_id varchar NOT NULL,
    filename varchar,
    hash varchar,
    CONSTRAINT version_internal_document_pkey PRIMARY KEY (package_id, version, revision, document_id),
    CONSTRAINT version_internal_document_published_version_fk FOREIGN KEY (package_id, version, revision)
        REFERENCES public.published_version(package_id, version, revision) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT version_internal_document_data_fk FOREIGN KEY (hash)
        REFERENCES public.version_internal_document_data(hash)
);

CREATE INDEX IF NOT EXISTS version_internal_document_hash_idx ON public.version_internal_document(hash);

CREATE TABLE IF NOT EXISTS public.comparison_internal_document_data (
    hash varchar NOT NULL,
    data bytea,
    CONSTRAINT comparison_internal_document_data_pkey PRIMARY KEY (hash)
);

CREATE TABLE IF NOT EXISTS public.comparison_internal_document (
    package_id varchar NOT NULL,
    version varchar NOT NULL,
    revision integer NOT NULL,
    previous_package_id varchar NOT NULL,
    previous_version varchar NOT NULL,
    previous_revision integer NOT NULL,
    document_id varchar NOT NULL,
    filename varchar,
    hash varchar,
    CONSTRAINT comparison_internal_document_pkey PRIMARY KEY (package_id, version, revision, previous_package_id, previous_version, previous_revision, document_id),
    CONSTRAINT comparison_internal_document_version_comparison_fk FOREIGN KEY (package_id, version, revision, previous_package_id, previous_version, previous_revision)
        REFERENCES public.version_comparison(package_id, version, revision, previous_package_id, previous_version, previous_revision) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT comparison_internal_document_data_fk FOREIGN KEY (hash)
        REFERENCES public.comparison_internal_document_data(hash)
);

CREATE INDEX IF NOT EXISTS comparison_internal_document_hash_idx ON public.comparison_internal_document(hash);

ALTER TABLE operation
    ADD COLUMN version_internal_document_id varchar;

ALTER TABLE operation_comparison
    ADD COLUMN comparison_internal_document_id varchar;

