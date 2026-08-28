CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer,
  sample_col timestamp with time zone DEFAULT '2025-01-01 00:00:00+02'
);
