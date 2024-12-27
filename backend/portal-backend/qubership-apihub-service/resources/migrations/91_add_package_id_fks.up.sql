alter table build
    add constraint build_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;

alter table published_data
    add constraint published_data_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;

alter table published_sources_data
    add constraint published_sources_data_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;

alter table shared_url_info
    add constraint shared_url_info_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;

alter table published_version_open_count
    add constraint published_version_open_count_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;

alter table activity_tracking
    add constraint activity_tracking_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;

alter table migrated_version
    add constraint migrated_version_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;

alter table published_document_open_count
    add constraint published_document_open_count_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;

alter table operation_comparison
    add constraint operation_comparison_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;

alter table ts_published_data_errors
    add constraint ts_published_data_errors_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;

alter table ts_published_data_custom_split
    add constraint ts_published_data_custom_split_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;
