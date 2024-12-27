DELETE FROM published_version_reference WHERE relation_type = 'depend';

ALTER TABLE published_version_reference DROP CONSTRAINT "PK_published_version_reference";
ALTER TABLE published_version_reference DROP COLUMN relation_type;
ALTER TABLE published_version_reference ADD CONSTRAINT "PK_published_version_reference"
    PRIMARY KEY (package_id,version,revision,reference_id,reference_version)
;
