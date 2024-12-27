truncate table branch_draft_content;
truncate table branch_draft_reference;

CREATE TABLE drafted_branches
(
    project_id  varchar NOT NULL,
    branch_name varchar NOT NULL,
    change_type varchar,
    original_config bytea,
    editors varchar[],
    PRIMARY KEY (project_id, branch_name)
);
