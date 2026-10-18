CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.parent (
  id integer PRIMARY KEY
);

CREATE TABLE public.t (
  id integer,
  parent_id integer REFERENCES public.parent (id)
);
