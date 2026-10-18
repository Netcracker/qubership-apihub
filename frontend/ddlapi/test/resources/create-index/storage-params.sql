CREATE TABLE items (id bigint PRIMARY KEY, name text);

CREATE INDEX idx_items_name ON items (name) WITH (deduplicate_items = false);
