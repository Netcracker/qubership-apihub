CREATE TABLE audit_log (
  id bigint PRIMARY KEY,
  action text NOT NULL,
  performed_at timestamp DEFAULT now()
) WITH (fillfactor = 70, autovacuum_enabled = false);
