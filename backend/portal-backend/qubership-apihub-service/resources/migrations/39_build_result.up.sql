CREATE TABLE build_result
(
    build_id    varchar NOT NULL,
    data bytea NOT NULL
);

ALTER TABLE build_result ADD CONSTRAINT "FK_build_result_build_id"
    FOREIGN KEY (build_id) REFERENCES build (build_id) ON DELETE Cascade ON UPDATE Cascade;