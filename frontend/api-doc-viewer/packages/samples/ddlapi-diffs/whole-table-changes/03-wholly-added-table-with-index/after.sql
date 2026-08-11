CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer
);

CREATE INDEX idx_t_id ON public.t (id);
