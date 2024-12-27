ALTER TABLE favorite_projects DROP CONSTRAINT "PK_favorite_projects";

CREATE TABLE favorites
(
    user_id varchar NOT NULL,
    id varchar NOT NULL
);

ALTER TABLE favorites ADD CONSTRAINT "PK_favorite_projects"
    PRIMARY KEY (user_id, id);

INSERT INTO favorites
(SELECT user_id, project_id from favorite_projects) ON CONFLICT DO NOTHING;

INSERT INTO favorites
(SELECT user_id, package_id from favorite_packages) ON CONFLICT DO NOTHING;

DROP TABLE favorite_projects;
DROP TABLE favorite_packages;