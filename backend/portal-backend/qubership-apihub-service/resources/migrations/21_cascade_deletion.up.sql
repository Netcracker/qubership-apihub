
ALTER TABLE branch_draft_content DROP CONSTRAINT "FK_project";
ALTER TABLE branch_draft_content ADD CONSTRAINT "FK_project"
    FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE Cascade ON UPDATE Cascade
;

ALTER TABLE branch_draft_reference DROP CONSTRAINT "FK_project";
ALTER TABLE branch_draft_reference ADD CONSTRAINT "FK_project"
    FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE Cascade ON UPDATE Cascade
;

ALTER TABLE project DROP CONSTRAINT "FK_parent_project_id";
ALTER TABLE project ADD CONSTRAINT "FK_parent_project_id"
    FOREIGN KEY (parent_id) REFERENCES project (id) ON DELETE Cascade ON UPDATE Cascade
;

ALTER TABLE published_version DROP CONSTRAINT "FK_project";
ALTER TABLE published_version ADD CONSTRAINT "FK_project"
    FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE Cascade ON UPDATE Cascade
;

ALTER TABLE published_version_reference DROP CONSTRAINT "FK_published_version";
ALTER TABLE published_version_reference ADD CONSTRAINT "FK_published_version"
    FOREIGN KEY (project_id,version,revision) REFERENCES published_version (project_id,version,revision) ON DELETE Cascade ON UPDATE Cascade
;

ALTER TABLE published_version_revision_content DROP CONSTRAINT "FK_published_data";
ALTER TABLE published_version_revision_content ADD CONSTRAINT "FK_published_data"
    FOREIGN KEY (checksum,project_id) REFERENCES published_data (checksum,project_id) ON DELETE Cascade ON UPDATE Cascade
;

ALTER TABLE published_version_revision_content DROP CONSTRAINT "FK_published_version_revision";
ALTER TABLE published_version_revision_content ADD CONSTRAINT "FK_published_version_revision"
    FOREIGN KEY (project_id,version,revision) REFERENCES published_version (project_id,version,revision) ON DELETE Cascade ON UPDATE Cascade
;

ALTER TABLE published_sources DROP CONSTRAINT "FK_published_sources_data";
ALTER TABLE published_sources ADD CONSTRAINT "FK_published_sources_data"
    FOREIGN KEY (checksum,project_id) REFERENCES published_sources_data (checksum,project_id) ON DELETE Cascade ON UPDATE Cascade;

ALTER TABLE published_sources DROP CONSTRAINT "FK_published_sources_version_revision";
ALTER TABLE published_sources ADD CONSTRAINT "FK_published_sources_version_revision"
    FOREIGN KEY (project_id,version,revision) REFERENCES published_version (project_id,version,revision) ON DELETE Cascade ON UPDATE Cascade;