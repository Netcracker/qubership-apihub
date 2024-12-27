ALTER TABLE branch_draft_content
DROP COLUMN is_updated;

ALTER TABLE branch_draft_content
ADD COLUMN action VARCHAR,
ADD COLUMN moved_from VARCHAR;

ALTER TABLE branch_draft_reference
ADD COLUMN action VARCHAR;