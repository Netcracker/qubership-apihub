CREATE TABLE system_role
(
    user_id    varchar NOT NULL,
    role  varchar NOT NULL
);
CREATE TABLE package_member_role
(
    user_id    varchar NOT NULL,
    package_id    varchar NOT NULL,
    role  varchar NOT NULL,
    created_by  varchar NOT NULL,
    created_at  timestamp without time zone NOT NULL,
    updated_by  varchar NULL,
    updated_at  timestamp without time zone NULL
);

ALTER TABLE package_group 
ADD COLUMN default_role varchar NOT NULL default 'Viewer';

ALTER TABLE package_member_role ADD CONSTRAINT "PK_package_member_role"
    PRIMARY KEY (package_id, user_id);
