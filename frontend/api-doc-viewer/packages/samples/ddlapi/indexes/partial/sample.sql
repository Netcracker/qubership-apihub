CREATE TABLE t (
  status text,
  owner_id integer
);

CREATE INDEX idx_t_active_owner ON t (owner_id) WHERE status = 'active';
