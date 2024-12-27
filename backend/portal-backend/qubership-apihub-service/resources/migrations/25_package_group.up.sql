DROP TABLE IF EXISTS package_group;
ALTER TABLE published_version DROP CONSTRAINT "FK_project";
ALTER TABLE apihub_api_keys DROP CONSTRAINT "FK_project";
ALTER TABLE project DROP CONSTRAINT "FK_parent_project_id";

CREATE TABLE package_group as SELECT * FROM project;

delete from project where kind = 'group';

ALTER TABLE package_group ADD CONSTRAINT "PK_project_group"
    PRIMARY KEY (id)
;

UPDATE package_group SET kind = 'package' where kind = 'project'; 

ALTER TABLE package_group 
    DROP COLUMN repository_url,
    DROP COLUMN repository_name,
    DROP COLUMN repository_id,
    DROP COLUMN integration_type,
    DROP COLUMN default_branch,
    DROP COLUMN default_folder;

ALTER TABLE package_group
    ADD COLUMN created_at timestamp without time zone,
    ADD COLUMN created_by varchar,
    ADD COLUMN deleted_by varchar;

ALTER TABLE package_group
    RENAME COLUMN delete_date to deleted_at;

ALTER TABLE package_group ADD CONSTRAINT "FK_parent_package_group"
    FOREIGN KEY (parent_id) REFERENCES package_group (id) ON DELETE Cascade ON UPDATE Cascade
;
ALTER TABLE published_version ADD CONSTRAINT "FK_package_group"
    FOREIGN KEY (project_id) REFERENCES package_group (id) ON DELETE Cascade ON UPDATE Cascade
;
ALTER TABLE apihub_api_keys ADD CONSTRAINT "FK_package_group"
    FOREIGN KEY (project_id) REFERENCES package_group (id) ON DELETE Cascade ON UPDATE Cascade
;