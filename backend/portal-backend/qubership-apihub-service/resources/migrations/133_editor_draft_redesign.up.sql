alter table drafted_branches 
add column commit_id varchar;

alter table branch_draft_content 
add column blob_id varchar,
add column conflicted_blob_id varchar;

--set blob_it=commit_id for some draft files because it will be impossible to calculate blob_id for them via soft migration
update branch_draft_content set blob_id = commit_id
where coalesce(commit_id, '') != ''
and data is null;

--next migration

-- alter table branch_draft_content 
-- drop column commit_id,
-- drop column conflicted_commit_id;