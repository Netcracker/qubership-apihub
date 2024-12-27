ALTER TABLE drafted_branches ADD CONSTRAINT "FK_project"
    FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE Cascade ON UPDATE Cascade
;