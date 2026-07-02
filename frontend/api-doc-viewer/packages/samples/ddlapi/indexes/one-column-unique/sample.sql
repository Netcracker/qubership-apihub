CREATE TABLE t (
  code text
);

CREATE UNIQUE INDEX idx_t_code ON t (code);
