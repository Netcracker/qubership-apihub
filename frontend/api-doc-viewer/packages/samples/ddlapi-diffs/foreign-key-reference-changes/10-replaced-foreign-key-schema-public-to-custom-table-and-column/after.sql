CREATE SCHEMA custom;

CREATE TABLE custom.target_new (
  code integer PRIMARY KEY
);

CREATE TABLE public.t (
  ref_id integer REFERENCES custom.target_new(code)
);
