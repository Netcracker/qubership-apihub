CREATE TABLE parent (
  id bigint PRIMARY KEY
);

CREATE TABLE t (
  id bigint NOT NULL PRIMARY KEY REFERENCES parent (id)
);
