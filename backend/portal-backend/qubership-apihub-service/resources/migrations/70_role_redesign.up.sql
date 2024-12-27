alter table package_member_role add column roles varchar array default '{}';

update package_member_role set roles = array_append(roles, lower(role)::varchar);
update package_group set default_role = lower(default_role);

alter table package_member_role drop column role;
delete from package_member_role where roles = ARRAY[]::varchar[];
delete from package_member_role where roles = ARRAY[null]::varchar[];

create table role 
(
    id varchar not null,
    role varchar not null,
    rank int not null,
    permissions varchar array,
    read_only bool,
    PRIMARY KEY(id)
);

insert into role(id, role, rank, permissions, read_only)
values
('admin', 'Admin', 1000, ARRAY['read', 'create_and_update_package', 'delete_package', 'manage_draft_version', 'manage_release_candidate_version', 'manage_release_version', 'manage_archived_version', 'manage_deprecated_version', 'user_access_management', 'access_token_management'], true),
('release-manager', 'Release Manager', 4, ARRAY['read', 'manage_release_version'], false),
('owner', 'Owner', 3, ARRAY['read', 'create_and_update_package', 'delete_package', 'manage_draft_version', 'manage_release_candidate_version', 'manage_release_version', 'manage_archived_version', 'manage_deprecated_version'], false),
('editor', 'Editor', 2, ARRAY['read', 'manage_draft_version', 'manage_release_candidate_version', 'manage_archived_version', 'manage_deprecated_version'], false),
('viewer', 'Viewer', 1, ARRAY['read'], true),
('none', 'None', 0, ARRAY[]::varchar[], true);

alter table apihub_api_keys add column roles varchar array default '{}';
update apihub_api_keys set roles = array_append(roles, lower(role)::varchar);

alter table apihub_api_keys drop column role;
update apihub_api_keys 
set roles = ARRAY['admin']::varchar[] 
where roles = ARRAY[]::varchar[]
or roles = ARRAY[null]::varchar[];