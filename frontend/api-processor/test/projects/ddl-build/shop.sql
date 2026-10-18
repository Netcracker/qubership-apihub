CREATE TABLE users (
  id    bigint       PRIMARY KEY,
  email varchar(255) NOT NULL
);
COMMENT ON TABLE users IS 'Registered users';

CREATE INDEX idx_users_email ON users (email);

CREATE TABLE shop.products (
  id   bigint       PRIMARY KEY,
  name varchar(100) NOT NULL
);
