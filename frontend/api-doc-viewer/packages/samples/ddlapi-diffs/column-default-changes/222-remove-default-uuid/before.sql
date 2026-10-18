CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer,
  sample_col uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000'
);
