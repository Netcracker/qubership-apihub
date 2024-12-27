create table version_comparison
(
    package_id  varchar not null,
    version varchar not null,
    revision integer not null,
    previous_package_id varchar not null,
    previous_version varchar not null,
    previous_revision integer not null,
    comparison_id varchar not null,
    operation_types jsonb[] null,
    refs varchar[] null,
    open_count bigint not null,
    last_active timestamp without time zone not null,
    no_content boolean not null,
    PRIMARY KEY(package_id, version, revision, previous_package_id, previous_version, previous_revision),
    UNIQUE(comparison_id)
);

truncate table changed_operation;

alter table changed_operation RENAME TO operation_comparison;

alter table operation_comparison add column comparison_id varchar;

ALTER TABLE operation_comparison ADD CONSTRAINT "FK_version_comparison"
    FOREIGN KEY (comparison_id) REFERENCES version_comparison (comparison_id) ON DELETE Cascade ON UPDATE Cascade;