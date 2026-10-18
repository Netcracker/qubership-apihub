CREATE TABLE kept (
  id bigint PRIMARY KEY,
  name text NOT NULL
);

ALTER TABLE kept ADD COLUMN extra text;

DROP TABLE IF EXISTS old_table;

CREATE SEQUENCE my_seq START 1;

CREATE TABLE also_kept (
  id bigint PRIMARY KEY,
  value integer
);
