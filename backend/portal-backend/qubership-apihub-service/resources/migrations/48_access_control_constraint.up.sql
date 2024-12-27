ALTER TABLE package_member_role ADD CONSTRAINT "FK_package_group"
    FOREIGN KEY (package_id) REFERENCES package_group (id) ON DELETE Cascade ON UPDATE Cascade;
ALTER TABLE system_role ADD CONSTRAINT "PK_system_role"
    PRIMARY KEY (user_id);