CREATE TABLE parent (
  id bigint PRIMARY KEY
);

CREATE TABLE t (
  id bigint PRIMARY KEY REFERENCES parent (id)
);
