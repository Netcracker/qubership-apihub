CREATE TABLE products (
  id bigint PRIMARY KEY,
  price numeric(10, 2),
  CONSTRAINT positive_price CHECK (price > 0)
);

COMMENT ON CONSTRAINT positive_price ON products IS 'Ensures price is always positive';
