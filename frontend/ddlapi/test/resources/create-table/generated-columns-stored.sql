CREATE TABLE employees (
  id bigint PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  full_name text GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED
);
