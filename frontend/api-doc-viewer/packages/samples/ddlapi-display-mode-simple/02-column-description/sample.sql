CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  title text NOT NULL
);

COMMENT ON COLUMN public.t.title IS 'Order title';
