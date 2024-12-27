ALTER TABLE favorites DROP CONSTRAINT "PK_favorite_projects";

delete from favorites f
where f.user_id not in (select ud.user_id from user_data ud);

CREATE TABLE favorite_projects
(
    user_id varchar NOT NULL,
    project_id varchar NOT NULL
);

ALTER TABLE favorite_projects ADD CONSTRAINT "PK_favorite_projects"
    PRIMARY KEY (user_id, project_id);

ALTER TABLE favorite_projects ADD CONSTRAINT "FK_favorite_projects_project"
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;

ALTER TABLE favorite_projects ADD CONSTRAINT "FK_favorite_projects_user_data"
    FOREIGN KEY (user_id) REFERENCES user_data(user_id) ON DELETE CASCADE;


CREATE TABLE favorite_packages
(
    user_id varchar NOT NULL,
    package_id varchar NOT NULL
);

ALTER TABLE favorite_packages ADD CONSTRAINT "PK_favorite_packages"
    PRIMARY KEY (user_id, package_id);

ALTER TABLE favorite_packages ADD CONSTRAINT "FK_favorite_packages_package_group"
    FOREIGN KEY (package_id) REFERENCES package_group(id) ON DELETE CASCADE;

ALTER TABLE favorite_packages ADD CONSTRAINT "FK_favorite_packages_user_data"
    FOREIGN KEY (user_id) REFERENCES user_data(user_id) ON DELETE CASCADE;

INSERT INTO favorite_projects
(
    select f.* from favorites f
    inner join project as p
    on p.id = f.id
) ON CONFLICT DO NOTHING;

INSERT INTO favorite_packages
(
    select f.* from favorites f
    inner join package_group as p
    on p.id = f.id
) ON CONFLICT DO NOTHING;

DROP TABLE favorites;
