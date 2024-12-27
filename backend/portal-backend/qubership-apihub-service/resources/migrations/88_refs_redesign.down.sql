delete from published_version_reference where parent_reference_id != '';

alter table published_version_reference
drop column reference_revision,
drop column parent_reference_id,
drop column parent_reference_version,
drop column parent_reference_revision;

ALTER TABLE published_version_reference DROP CONSTRAINT if exists "PK_published_version_reference";
ALTER TABLE published_version_reference ADD CONSTRAINT "PK_published_version_reference"
    PRIMARY KEY (
        package_id,
        version,
        revision,
        reference_id,
        reference_version);