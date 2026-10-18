CREATE TABLE accounts (id bigint PRIMARY KEY, code text NOT NULL);

CREATE UNIQUE INDEX idx_accounts_code ON accounts (code);
