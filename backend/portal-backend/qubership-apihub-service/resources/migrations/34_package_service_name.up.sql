CREATE TABLE package_service
(
    package_id varchar NOT NULL,
    service_name varchar NOT NULL,
    UNIQUE (service_name)
);

ALTER TABLE package_service ADD CONSTRAINT "PK_package_service"
    PRIMARY KEY (package_id, service_name);

ALTER TABLE package_service ADD CONSTRAINT "FK_package_group"
    FOREIGN KEY (package_id) REFERENCES package_group (id) ON DELETE Cascade ON UPDATE Cascade;
