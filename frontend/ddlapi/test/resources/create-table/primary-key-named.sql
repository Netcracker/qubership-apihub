CREATE TABLE orders (
  id bigint NOT NULL,
  total numeric(12, 2),
  CONSTRAINT pk_orders PRIMARY KEY (id)
);
