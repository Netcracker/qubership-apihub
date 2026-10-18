CREATE TABLE venues (id bigint PRIMARY KEY, location point);

CREATE INDEX idx_venues_location ON venues USING spgist (location);
