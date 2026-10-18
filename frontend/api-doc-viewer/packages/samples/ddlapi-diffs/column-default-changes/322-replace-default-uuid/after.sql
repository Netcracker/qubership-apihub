CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer,
  sample_col uuid DEFAULT '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
);
