ALTER TABLE branch_draft_content 
DROP COLUMN is_folder;
ALTER TABLE branch_draft_content 
DROP COLUMN from_folder;
ALTER TABLE branch_draft_content
ALTER COLUMN name set not null;