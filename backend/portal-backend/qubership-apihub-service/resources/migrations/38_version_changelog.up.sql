CREATE TABLE published_version_validation
(
    package_id varchar NOT NULL,
    version varchar NOT NULL,
    revision integer NOT NULL,
    changelog jsonb,
    spectral jsonb,
    bwc jsonb
);

ALTER TABLE published_version_validation ADD CONSTRAINT "PK_published_version_validation"
    PRIMARY KEY (package_id,version,revision);

ALTER TABLE published_version_validation ADD CONSTRAINT "FK_published_version_validation"
    FOREIGN KEY (package_id,version,revision) REFERENCES published_version (package_id,version,revision) ON DELETE Cascade ON UPDATE Cascade;