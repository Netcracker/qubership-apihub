DROP TABLE IF EXISTS shared_url_info CASCADE
;
CREATE TABLE shared_url_info
(
    project_id varchar NOT NULL,
    version    varchar NOT NULL,
    file_id    varchar NOT NULL,
    shared_id varchar NOT NULL
)
;
ALTER TABLE shared_url_info
    ADD CONSTRAINT "PK_shared_url_info"
        PRIMARY KEY (shared_id)
;
ALTER TABLE shared_url_info
    ADD CONSTRAINT "shared_url_info__file_info"
        UNIQUE (project_id, version, file_id)
;