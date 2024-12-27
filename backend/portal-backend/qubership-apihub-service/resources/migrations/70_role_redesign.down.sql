--data migration from roles array to role varchar is not possible
alter table package_member_role add column role varchar;
alter table package_member_role drop column roles;
alter table apihub_api_keys add column role varchar;
alter table apihub_api_keys drop column roles;
drop table role;