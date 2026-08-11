CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer,
  a integer,
  b integer,
  summary text GENERATED ALWAYS AS (
    'A=' || a::text || ', B=' || b::text || ', PRODUCT=' || (a * b)::text || ', PADDING=' || repeat('y', 12)
  ) STORED
);
