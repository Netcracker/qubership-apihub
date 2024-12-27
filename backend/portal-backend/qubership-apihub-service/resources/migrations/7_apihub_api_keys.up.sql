CREATE TABLE apihub_api_keys
(
    id varchar PRIMARY KEY,
    project_id varchar NOT NULL,
    name varchar NOT NULL,
    created_by varchar NOT NULL,
    created_at timestamp without time zone NOT NULL,
    deleted_by varchar NULL,
    deleted_at timestamp without time zone NULL,
    api_key varchar NOT NULL
)
;

ALTER TABLE apihub_api_keys ADD CONSTRAINT "FK_project"
    FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE Cascade ON UPDATE Cascade
;