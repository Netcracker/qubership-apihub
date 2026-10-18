CREATE TABLE t (
  name text
);

CREATE INDEX idx_t_name_lower ON t ((lower(name)));
