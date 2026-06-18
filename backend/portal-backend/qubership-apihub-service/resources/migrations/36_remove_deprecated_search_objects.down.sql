CREATE TABLE IF NOT EXISTS public.ts_operation_data (
    data_hash character varying NOT NULL,
    scope_all tsvector,
    CONSTRAINT pk_ts_operation_data PRIMARY KEY (data_hash),
    CONSTRAINT ts_operation_data_operation_data_hash_fk FOREIGN KEY (data_hash) REFERENCES public.operation_data(data_hash) ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS ts_operation_data_idx
    ON public.ts_operation_data USING gin (scope_all) WITH (fastupdate='true');

CREATE TABLE IF NOT EXISTS public.fts_operation_data (
    data_hash character varying NOT NULL,
    data_vector tsvector,
    CONSTRAINT pk_fts_operation_data PRIMARY KEY (data_hash),
    CONSTRAINT fts_operation_data_operation_data_hash_fk FOREIGN KEY (data_hash) REFERENCES public.operation_data(data_hash) ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS fts_operation_data_data_vector_index
    ON public.fts_operation_data USING gin (data_vector);

CREATE TABLE IF NOT EXISTS public.fts_latest_release_operation_data (
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    revision integer NOT NULL,
    operation_id character varying NOT NULL,
    api_type character varying NOT NULL,
    data_vector tsvector,
    CONSTRAINT pk_fts_latest_release_operation_data PRIMARY KEY (package_id, version, revision, operation_id)
);

CREATE INDEX IF NOT EXISTS fts_latest_release_operation_data_data_vector_index
    ON public.fts_latest_release_operation_data USING gin (data_vector);

ALTER TABLE operation_data ADD COLUMN IF NOT EXISTS search_scope jsonb;
