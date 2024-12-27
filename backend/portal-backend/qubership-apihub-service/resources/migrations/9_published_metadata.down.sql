ALTER TABLE published_version
    ADD COLUMN branch_name varchar;

update published_version t
set branch_name = jsonb_extract_path_text(s.metadata, 'branch_name')
from published_version s
where t.project_id = s.project_id
    and t.version = s.version
    and t.revision = s.revision;

ALTER TABLE published_version
    DROP COLUMN metadata;

ALTER TABLE published_data
    ADD COLUMN commit_id varchar,
    ADD COLUMN commit_date timestamp without time zone;

update published_data t
set commit_id = jsonb_extract_path_text(s.metadata, 'commit_id')
from published_data s
where t.project_id = s.project_id
    and t.checksum = s.checksum;

ALTER TABLE published_data
    DROP COLUMN metadata;