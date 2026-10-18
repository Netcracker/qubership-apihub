CREATE TABLE t (
  order_id integer,
  customer_id integer
);

CREATE INDEX idx_t_order ON t (order_id) INCLUDE (customer_id);
