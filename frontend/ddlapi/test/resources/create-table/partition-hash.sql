CREATE TABLE order_items (
  order_id bigint NOT NULL,
  product_id bigint NOT NULL,
  quantity integer
) PARTITION BY HASH (order_id);
