CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  title text NOT NULL
);

CREATE INDEX t_title_idx ON public.t (title);

COMMENT ON INDEX public.t_title_idx IS 'Lookup by title';
