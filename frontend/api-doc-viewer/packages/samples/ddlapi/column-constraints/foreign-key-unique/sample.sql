CREATE TABLE parent (
  id bigint PRIMARY KEY
);

CREATE TABLE t (
  ref_id bigint UNIQUE REFERENCES parent (id)
);
