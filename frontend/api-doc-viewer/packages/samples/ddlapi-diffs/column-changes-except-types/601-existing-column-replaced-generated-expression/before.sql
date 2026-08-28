CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer,
  a integer,
  b integer,
  summary text GENERATED ALWAYS AS (
    'A=' || a::text || ', B=' || b::text || ', TOTAL=' || (a + b)::text || ', NOTE=' || repeat('x', 10)
  ) STORED
);
