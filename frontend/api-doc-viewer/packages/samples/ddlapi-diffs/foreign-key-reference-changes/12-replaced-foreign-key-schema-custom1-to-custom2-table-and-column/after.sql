CREATE SCHEMA custom2;

CREATE TABLE custom2.target_new (
  code integer PRIMARY KEY
);

CREATE TABLE public.t (
  ref_id integer REFERENCES custom2.target_new(code)
);
