CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer,
  sample_col date DEFAULT '2025-01-01'
);
