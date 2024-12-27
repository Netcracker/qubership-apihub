ALTER TABLE published_version
    ADD COLUMN metadata jsonb;

update published_version t
set metadata = jsonb_build_object('branch_name', s.branch_name)
from published_version s
where t.project_id = s.project_id
    and t.version = s.version
    and t.revision = s.revision;

ALTER TABLE published_version
    DROP COLUMN branch_name;


ALTER TABLE published_data
    ADD COLUMN metadata jsonb;

update published_data t
set metadata = jsonb_build_object('commit_id', s.commit_id, 'commit_date', to_char(s.commit_date,'DD-MM-YYYY hh24:mi:ss'))
from published_data s
where t.project_id = s.project_id
    and t.checksum = s.checksum;

ALTER TABLE published_data
    DROP COLUMN commit_id,
    DROP COLUMN commit_date;
