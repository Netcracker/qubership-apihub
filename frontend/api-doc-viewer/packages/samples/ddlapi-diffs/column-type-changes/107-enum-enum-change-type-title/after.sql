CREATE SCHEMA IF NOT EXISTS public;

CREATE TYPE public.account_status AS ENUM ('new', 'active');

CREATE TABLE public.t (
  id integer,
  status public.account_status
);
