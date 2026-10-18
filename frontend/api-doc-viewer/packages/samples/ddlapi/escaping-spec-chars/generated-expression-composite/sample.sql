CREATE TABLE t (
  first_name text,
  last_name text,
  label text GENERATED ALWAYS AS (lower(trim(first_name)) || ' ' || upper(last_name)) STORED
);
