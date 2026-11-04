CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  status text NOT NULL,
  label text GENERATED ALWAYS AS (lower(status)) STORED
);
