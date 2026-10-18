CREATE TABLE currency_codes (
  id bigint PRIMARY KEY,
  code text NOT NULL,
  CONSTRAINT valid_code CHECK (code ~ '^[A-Z]{3}$')
);
