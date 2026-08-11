CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer,
  sample_col bit(3) DEFAULT B'101'
);
