CREATE TABLE users (
  id bigint PRIMARY KEY,
  email text NOT NULL
);

CREATE INDEX idx_users_email ON users (email);

COMMENT ON TABLE users IS 'Application users';
COMMENT ON COLUMN users.email IS 'Unique email address';
COMMENT ON INDEX idx_users_email IS 'Email lookup index';
