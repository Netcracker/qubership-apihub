CREATE TABLE events (id bigint PRIMARY KEY, payload jsonb);

CREATE INDEX idx_events_payload ON events USING gin (payload jsonb_path_ops);
