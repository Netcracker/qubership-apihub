CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  status text NOT NULL,
  display_status text GENERATED ALWAYS AS (upper(status)) STORED
);
