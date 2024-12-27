CREATE TABLE builder_task
(
    build_id    varchar NOT NULL,
    builder_id  varchar NOT NULL
);

ALTER TABLE builder_task ADD CONSTRAINT "FK_builder_task_build_id"
    FOREIGN KEY (build_id) REFERENCES build (build_id) ON DELETE Cascade ON UPDATE Cascade;

ALTER TABLE builder_task ADD CONSTRAINT "PK_builder_task" PRIMARY KEY (build_id);