CREATE TABLE published_sources
(
    project_id varchar NOT NULL,
    version varchar NOT NULL,
    revision integer NOT NULL,
    checksum varchar NOT NULL
);

CREATE TABLE published_sources_data
(
    project_id varchar NOT NULL,
    checksum varchar NOT NULL,
    data bytea NOT NULL
);

ALTER TABLE published_sources_data ADD CONSTRAINT "PK_published_sources_data"
    PRIMARY KEY (checksum,project_id);

ALTER TABLE published_sources ADD CONSTRAINT "FK_published_sources_data"
    FOREIGN KEY (checksum,project_id) REFERENCES published_sources_data (checksum,project_id) ON DELETE Restrict ON UPDATE Cascade;

ALTER TABLE published_sources ADD CONSTRAINT "FK_published_sources_version_revision"
    FOREIGN KEY (project_id,version,revision) REFERENCES published_version (project_id,version,revision) ON DELETE Restrict ON UPDATE Cascade;


