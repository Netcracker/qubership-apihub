CREATE TABLE items (
  id bigint PRIMARY KEY,
  code text NOT NULL,
  CONSTRAINT uq_code UNIQUE (code)
);
