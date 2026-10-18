CREATE SCHEMA IF NOT EXISTS public;

CREATE TYPE public.user_status AS ENUM ('new', 'enabled');

CREATE TABLE public.t (
  id integer,
  status public.user_status
);
