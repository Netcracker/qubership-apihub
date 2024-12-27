truncate table branch_draft_content;
truncate table branch_draft_reference;

ALTER TABLE branch_draft_content 
RENAME COLUMN action TO status;

ALTER TABLE branch_draft_content 
ADD COLUMN last_status varchar,
ADD COLUMN conflicted_commit_id varchar,
ADD COLUMN conflicted_file_id varchar;

ALTER TABLE branch_draft_reference 
RENAME COLUMN action TO status;