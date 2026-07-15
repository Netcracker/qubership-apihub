CREATE SCHEMA custom;

CREATE TABLE custom.parent (
  id bigint PRIMARY KEY
);

CREATE TABLE t (
  ref_id bigint REFERENCES custom.parent (id)
);
