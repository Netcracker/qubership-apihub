CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer,
  a integer,
  b integer,
  code integer GENERATED ALWAYS AS (
    (a + b) * 10 + abs(a - b) + greatest(coalesce(a, 0), coalesce(b, 0)) * 2
  ) STORED
);
