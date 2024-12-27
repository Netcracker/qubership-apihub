ALTER TABLE published_version_revision_content
DROP COLUMN format;

ALTER TABLE published_version_revision_content
ADD COLUMN description text;
