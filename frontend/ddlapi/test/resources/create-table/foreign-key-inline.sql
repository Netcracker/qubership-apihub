CREATE TABLE customers (
  id bigint PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE orders (
  id bigint PRIMARY KEY,
  customer_id bigint REFERENCES customers (id) ON DELETE RESTRICT
);
