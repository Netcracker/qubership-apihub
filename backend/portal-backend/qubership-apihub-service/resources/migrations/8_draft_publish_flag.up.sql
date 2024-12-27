ALTER TABLE branch_draft_content
    ADD COLUMN publish boolean;

UPDATE branch_draft_content
    SET publish = true;