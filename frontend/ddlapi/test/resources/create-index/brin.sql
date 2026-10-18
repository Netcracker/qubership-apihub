CREATE TABLE sensor_readings (id bigint PRIMARY KEY, recorded_at timestamp);

CREATE INDEX idx_sensor_brin ON sensor_readings USING brin (recorded_at);
