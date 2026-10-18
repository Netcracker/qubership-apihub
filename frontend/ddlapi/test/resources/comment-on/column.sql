CREATE TABLE users (id bigint PRIMARY KEY, email text NOT NULL);

COMMENT ON COLUMN users.email IS 'Primary contact email address';
