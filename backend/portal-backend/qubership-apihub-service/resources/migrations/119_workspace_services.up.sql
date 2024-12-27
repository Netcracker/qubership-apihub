alter table package_service add column workspace_id varchar;
update package_service set workspace_id = split_part(package_id, '.', 1);
alter table package_service alter column workspace_id set not null;

alter table package_service drop constraint package_service_service_name_key;

alter table package_service add UNIQUE(workspace_id, service_name);

alter table package_service drop constraint "PK_package_service";
alter table package_service add constraint "PK_package_service"
    primary key (workspace_id, package_id, service_name);

alter table package_service add constraint "FK_package_group_workspace"
    foreign key (workspace_id) references package_group (id) on delete Cascade on update Cascade;
