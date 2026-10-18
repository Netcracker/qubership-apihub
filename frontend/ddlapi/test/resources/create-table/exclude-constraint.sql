CREATE TABLE room_reservations (
  room_id bigint NOT NULL,
  during tstzrange NOT NULL,
  EXCLUDE USING gist (during WITH &&)
);
