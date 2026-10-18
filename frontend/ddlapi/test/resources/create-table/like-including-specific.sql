CREATE TABLE orders (
  id bigint PRIMARY KEY,
  total numeric(12, 2) DEFAULT 0.0,
  status text DEFAULT 'pending',
  CONSTRAINT positive_total CHECK (total >= 0)
);

CREATE TABLE orders_archive (LIKE orders INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
