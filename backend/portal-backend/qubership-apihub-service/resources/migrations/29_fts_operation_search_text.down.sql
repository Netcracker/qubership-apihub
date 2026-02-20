DROP TABLE IF EXISTS fts_operation_search_text;

CREATE TABLE IF NOT EXISTS public.ts_rest_operation_data (
    data_hash character varying NOT NULL,
    scope_request tsvector,
    scope_response tsvector,
    scope_annotation tsvector,
    scope_properties tsvector,
    scope_examples tsvector,
    CONSTRAINT pk_ts_rest_operation_data PRIMARY KEY (data_hash),
    CONSTRAINT ts_rest_operation_data_operation_data_hash_fk FOREIGN KEY (data_hash) REFERENCES public.operation_data(data_hash) ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS ts_rest_operation_data_idx
    ON public.ts_rest_operation_data USING gin (scope_request, scope_response, scope_annotation, scope_properties, scope_examples) WITH (fastupdate='true');

ALTER TABLE build_cleanup_run
    ADD COLUMN IF NOT EXISTS operation_data integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ts_operation_data integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ts_rest_operation_data integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ts_gql_operation_data integer DEFAULT 0;
