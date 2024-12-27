ALTER TABLE branch_draft_content 
RENAME COLUMN status TO action;

ALTER TABLE branch_draft_content 
DROP COLUMN last_status,
DROP COLUMN conflicted_commit_id,
DROP COLUMN conflicted_file_id;

ALTER TABLE branch_draft_reference 
RENAME COLUMN status TO action;