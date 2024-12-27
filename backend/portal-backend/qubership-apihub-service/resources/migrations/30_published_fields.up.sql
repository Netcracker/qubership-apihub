ALTER TABLE published_version_revision_content
DROP COLUMN description;

ALTER TABLE published_version_revision_content
ADD COLUMN format varchar;

update published_version_revision_content
set format = 'json' where file_id ilike '%.json';

update published_version_revision_content
set format = 'yaml' where file_id ilike '%.yaml' or file_id ilike '%.yml';

update published_version_revision_content
set format = 'md' where file_id ilike '%.md' or file_id ilike '%.markdown';

update published_version_revision_content
set format = 'unknown' where format is null;