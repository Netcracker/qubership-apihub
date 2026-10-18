CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer,
  sample_col timestamp with time zone DEFAULT '2024-06-15 12:00:00+02'
);
