CREATE TABLE branch_editors
(
    project_id  varchar NOT NULL,
    branch_name varchar NOT NULL,
    editors varchar[],
    PRIMARY KEY (project_id, branch_name)
);
