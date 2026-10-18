CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.t (
  id integer,
  shareability_status varchar DEFAULT 'unknown_1'::character varying NOT NULL
);
