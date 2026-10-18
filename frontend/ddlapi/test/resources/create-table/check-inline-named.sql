CREATE TABLE line_items (
  id bigint PRIMARY KEY,
  price numeric(10, 2) CONSTRAINT positive_price CHECK (price > 0)
);
