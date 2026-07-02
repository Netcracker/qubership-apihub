CREATE DOMAIN positive_int AS integer CHECK (VALUE > 0);

CREATE TABLE t (
  c positive_int
);
