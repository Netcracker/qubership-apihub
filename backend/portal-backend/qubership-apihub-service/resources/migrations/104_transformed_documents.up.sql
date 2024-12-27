CREATE TABLE if not exists transformed_content_data (
     package_id varchar NOT NULL,
     version varchar NOT NULL,
     revision integer NOT NULL,
     api_type varchar NOT NULL,
     group_id varchar NOT NULL,
     data bytea,
     documents_info jsonb[],
     PRIMARY KEY(package_id, version, revision, api_type, group_id)
);

ALTER TABLE transformed_content_data ADD CONSTRAINT "FK_transformed_content_data_operation_group"
    FOREIGN KEY (group_id) REFERENCES operation_group (group_id) ON DELETE Cascade ON UPDATE Cascade;