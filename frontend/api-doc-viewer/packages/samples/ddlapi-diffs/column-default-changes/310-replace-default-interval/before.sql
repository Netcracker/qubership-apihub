CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer,
  sample_col interval DEFAULT '1 day'
);
