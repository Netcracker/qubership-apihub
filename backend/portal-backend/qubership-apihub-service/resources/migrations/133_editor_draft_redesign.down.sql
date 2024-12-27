alter table drafted_branches drop column commit_id;

alter table branch_draft_content 
drop column blob_id,
drop column conflicted_blob_id;

--next migration

-- alter table branch_draft_content 
-- add column commit_id varchar,
-- add column conflicted_commit_id varchar;