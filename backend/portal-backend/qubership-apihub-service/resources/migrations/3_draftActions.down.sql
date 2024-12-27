ALTER TABLE branch_draft_content
DROP COLUMN moved_from,
DROP COLUMN action;

ALTER TABLE branch_draft_reference
DROP COLUMN action;

ALTER TABLE branch_draft_content
ADD COLUMN is_updated BOOLEAN;