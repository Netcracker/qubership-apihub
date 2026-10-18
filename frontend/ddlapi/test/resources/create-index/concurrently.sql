CREATE TABLE products (id bigint PRIMARY KEY, sku text NOT NULL);

CREATE INDEX CONCURRENTLY idx_products_sku ON products (sku);
