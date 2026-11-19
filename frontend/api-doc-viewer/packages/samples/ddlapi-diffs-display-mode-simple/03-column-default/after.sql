CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  status text NOT NULL DEFAULT 'draft'
);
