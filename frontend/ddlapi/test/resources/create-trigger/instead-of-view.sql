CREATE VIEW active_users AS SELECT id, email FROM users WHERE active = true;

CREATE TRIGGER trg_active_users_insert
  INSTEAD OF INSERT ON active_users
  FOR EACH ROW
  EXECUTE FUNCTION insert_active_user();
