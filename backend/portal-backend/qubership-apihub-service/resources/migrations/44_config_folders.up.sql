ALTER TABLE branch_draft_content 
ADD COLUMN is_folder bool,
ADD COLUMN from_folder bool;
ALTER TABLE branch_draft_content
ALTER COLUMN name DROP not null;