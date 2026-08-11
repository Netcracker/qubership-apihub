CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer,
  sample_col timestamp DEFAULT '2024-06-15 12:00:00'
);
