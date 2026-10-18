CREATE TABLE orders (id bigint PRIMARY KEY, customer_id bigint, created_at timestamp);

CREATE INDEX idx_orders_customer_date ON orders (customer_id, created_at DESC);
