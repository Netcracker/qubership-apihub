CREATE TABLE IF NOT EXISTS public.ts_graphql_operation_data (
    data_hash character varying NOT NULL,
    scope_argument tsvector,
    scope_property tsvector,
    scope_annotation tsvector,
    CONSTRAINT pk_ts_graphql_operation_data PRIMARY KEY (data_hash)
);

CREATE INDEX IF NOT EXISTS ts_graphql_operation_data_idx ON public.ts_graphql_operation_data USING gin (scope_argument, scope_property, scope_annotation) WITH (fastupdate='true');

ALTER TABLE ts_graphql_operation_data
    ADD CONSTRAINT ts_graphql_operation_data_operation_data_hash_fk
        FOREIGN KEY (data_hash) REFERENCES operation_data (data_hash)
            ON UPDATE CASCADE ON DELETE CASCADE;
