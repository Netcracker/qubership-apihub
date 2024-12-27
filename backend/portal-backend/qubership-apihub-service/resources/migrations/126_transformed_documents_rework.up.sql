alter table transformed_content_data add column build_type varchar default 'documentGroup';
alter table transformed_content_data add column format varchar default 'json';

alter table transformed_content_data drop constraint if exists transformed_content_data_pkey;
alter table transformed_content_data add constraint transformed_content_data_pkey
primary key(package_id, version, revision, api_type, group_id, build_type, format);

alter table operation_group add column template bytea;
alter table operation_group add column template_filename varchar;