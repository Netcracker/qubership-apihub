alter table operation_group drop column template;
alter table operation_group drop column template_filename;

alter table transformed_content_data drop constraint if exists transformed_content_data_pkey;
alter table transformed_content_data add constraint transformed_content_data_pkey
primary key(package_id, version, revision, api_type, group_id);

alter table transformed_content_data drop column format;
alter table transformed_content_data drop column build_type;
