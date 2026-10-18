CREATE TABLE locations (id bigint PRIMARY KEY, position point);

CREATE INDEX idx_locations_position ON locations USING gist (position);
