CREATE TABLE order_lines (id bigint PRIMARY KEY, order_id bigint, customer_id bigint, total_amount numeric);

CREATE INDEX idx_order_lines_order ON order_lines (order_id) INCLUDE (customer_id, total_amount);
