CREATE TABLE users (id bigint PRIMARY KEY, email text NOT NULL);

CREATE TRIGGER trg_users_after_insert
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_user();
