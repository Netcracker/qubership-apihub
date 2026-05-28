CREATE TABLE sessions (id bigint PRIMARY KEY, key text NOT NULL);

CREATE INDEX idx_sessions_key ON sessions USING hash (key);
