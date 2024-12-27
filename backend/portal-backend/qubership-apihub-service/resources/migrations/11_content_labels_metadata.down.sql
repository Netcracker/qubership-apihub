ALTER TABLE published_version_revision_content
    DROP COLUMN metadata;

ALTER TABLE branch_draft_content
    DROP COLUMN labels;
    