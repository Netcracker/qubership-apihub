CREATE SCHEMA IF NOT EXISTS public;

CREATE TYPE public.sample_status AS ENUM ('pending', 'done');

CREATE TABLE public.t (
  id integer,
  sample_col public.sample_status DEFAULT 'done'
);
