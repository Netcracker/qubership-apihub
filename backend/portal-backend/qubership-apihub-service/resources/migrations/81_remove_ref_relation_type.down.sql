alter table branch_draft_reference drop constraint "PK_branch_draft_reference";
alter table branch_draft_reference add column relation_type varchar not null default 'depend';
alter table branch_draft_reference add constraint "PK_branch_draft_reference"
    primary key (branch_name,project_id, reference_package_id, reference_version, relation_type);