create table package_export_config
(
    package_id             character varying
        constraint package_export_config_package_group_id_fk
            references package_group (id),
    allowed_oas_extensions character varying ARRAY not null
);

create unique index package_export_config_package_id_uindex
    on package_export_config (package_id);
