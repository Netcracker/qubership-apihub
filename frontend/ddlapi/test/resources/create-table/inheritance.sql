CREATE TABLE cities (
  name text NOT NULL,
  population bigint
);

CREATE TABLE capitals (
  state text NOT NULL
) INHERITS (cities);
