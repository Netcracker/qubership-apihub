CREATE TABLE t (
  a integer,
  b integer
);

CREATE UNIQUE INDEX idx_t_a_b ON t (a, b);
