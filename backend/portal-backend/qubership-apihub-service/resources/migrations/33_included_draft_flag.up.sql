ALTER TABLE branch_draft_content
ADD COLUMN included boolean NOT NULL default false;

update branch_draft_content set included = true where status = 'included';