alter table user_data add column private_package_id varchar not null default '';

update user_data set private_package_id = user_id;

ALTER TABLE user_data
ADD CONSTRAINT private_package_id_unique UNIQUE (private_package_id);