CREATE SCHEMA IF NOT EXISTS public;

CREATE TYPE public.mood AS ENUM ('happy', 'neutral');

CREATE TABLE public.t (
  feeling public.mood NOT NULL
);
