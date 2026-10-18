CREATE TABLE employees (id bigint PRIMARY KEY, salary numeric, updated_at timestamp);

CREATE TRIGGER trg_employees_before_update
  BEFORE UPDATE ON employees
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION record_change();
