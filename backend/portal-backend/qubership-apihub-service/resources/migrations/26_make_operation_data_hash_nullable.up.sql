ALTER TABLE public.operation ALTER COLUMN data_hash DROP NOT NULL;

DROP TABLE IF EXISTS ts_graphql_operation_data;
