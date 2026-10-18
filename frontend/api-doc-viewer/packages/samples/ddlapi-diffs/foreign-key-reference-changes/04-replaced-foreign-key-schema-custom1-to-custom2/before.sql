CREATE SCHEMA custom1;

CREATE TABLE custom1.target (
  id integer PRIMARY KEY
);

CREATE TABLE public.t (
  ref_id integer REFERENCES custom1.target(id)
);
