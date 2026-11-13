CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer NOT NULL
);

COMMENT ON TABLE public.t IS 'Customer orders, one row per order';
