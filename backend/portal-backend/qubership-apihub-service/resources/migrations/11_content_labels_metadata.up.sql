ALTER TABLE published_version_revision_content
    ADD COLUMN metadata jsonb;

ALTER TABLE branch_draft_content
    ADD COLUMN labels varchar[];