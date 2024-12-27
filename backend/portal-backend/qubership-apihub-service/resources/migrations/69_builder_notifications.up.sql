CREATE TABLE builder_notifications
(
build_id varchar NOT NULL,
severity varchar,
message varchar,
file_id integer,
FOREIGN KEY (build_id) REFERENCES build (build_id) ON DELETE Cascade ON UPDATE Cascade);