create table package_transition
(
    old_package_id varchar not null,
    new_package_id varchar not null
);

create index package_transition_old_package_id_index
    on package_transition (old_package_id);

update operation_group
set group_id=MD5(CONCAT_WS('@', package_id, version, revision, api_type, group_name))::varchar
where MD5(CONCAT_WS('@', package_id, version, revision, api_type, group_name))!= operation_group.group_id;