CREATE TABLE users (id bigint PRIMARY KEY, email text NOT NULL);

CREATE INDEX idx_users_email ON users (email);
