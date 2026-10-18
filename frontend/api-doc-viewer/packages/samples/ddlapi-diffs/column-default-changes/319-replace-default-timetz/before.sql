CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer,
  sample_col time with time zone DEFAULT '12:00:00+02'
);
