alter table branch_draft_reference drop constraint "PK_branch_draft_reference";
alter table branch_draft_reference drop column relation_type;
alter table branch_draft_reference add constraint "PK_branch_draft_reference"
    primary key (branch_name,project_id, reference_package_id, reference_version);