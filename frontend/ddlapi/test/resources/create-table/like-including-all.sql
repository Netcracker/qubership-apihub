CREATE TABLE accounts (
  id bigint PRIMARY KEY,
  email text NOT NULL,
  balance numeric(12, 2) DEFAULT 0.0 CHECK (balance >= 0)
);

CREATE TABLE accounts_log (LIKE accounts INCLUDING ALL);
