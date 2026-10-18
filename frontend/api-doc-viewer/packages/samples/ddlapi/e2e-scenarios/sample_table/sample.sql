CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.sample_table (
  id integer PRIMARY KEY,
  name character varying(100) NOT NULL
);
