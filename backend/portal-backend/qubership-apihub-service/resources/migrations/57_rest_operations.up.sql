ALTER TABLE published_version_revision_content 
ADD COLUMN operation_ids varchar[];

CREATE TABLE operation
(
package_id varchar NOT NULL,
version varchar NOT NULL,
revision integer NOT NULL,
operation_id varchar NOT NULL,
data_hash varchar NOT NULL,
deprecated boolean NOT NULL,
kind varchar NULL,
title varchar NULL,
metadata jsonb NULL,
type varchar NOT NULL,
CONSTRAINT pk_operation PRIMARY KEY (package_id, version, revision, operation_id)
);

CREATE TABLE operation_data
(
data_hash varchar NOT NULL,
data bytea NULL,
search_scope jsonb NULL,
CONSTRAINT pk_operation_data PRIMARY KEY (data_hash)
);

ALTER TABLE operation ADD CONSTRAINT "FK_published_version"
    FOREIGN KEY (package_id,version,revision) REFERENCES published_version (package_id,version,revision) ON DELETE Cascade ON UPDATE Cascade;

ALTER TABLE operation ADD CONSTRAINT "FK_operation_data"
    FOREIGN KEY (data_hash) REFERENCES operation_data (data_hash) ON DELETE Cascade ON UPDATE Cascade;

CREATE TABLE changed_operation
(
package_id varchar NOT NULL,
version varchar NOT NULL,
revision integer NOT NULL,
previous_package_id varchar NOT NULL,
previous_version varchar NOT NULL,
previous_revision integer NOT NULL,
operation_id varchar NOT NULL,
data_hash varchar NULL,
previous_data_hash varchar NULL,
changes_summary jsonb NULL,
changes jsonb NULL);