CREATE TABLE batch_items (id bigint PRIMARY KEY, status text);

CREATE TRIGGER trg_batch_items_after_update
  AFTER UPDATE ON batch_items
  REFERENCING NEW TABLE AS new_rows OLD TABLE AS old_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION process_batch_changes();
