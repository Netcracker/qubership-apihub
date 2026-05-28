CREATE TABLE audit_target (id bigint PRIMARY KEY, data text);

CREATE TRIGGER trg_audit_target_dml
  AFTER INSERT OR UPDATE OR DELETE ON audit_target
  FOR EACH STATEMENT
  EXECUTE FUNCTION log_dml_statement();
