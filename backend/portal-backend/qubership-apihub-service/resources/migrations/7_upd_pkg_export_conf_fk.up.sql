alter table package_export_config
    drop constraint package_export_config_package_group_id_fk;

alter table package_export_config
    add constraint package_export_config_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;
