create table if not exists versions_cleanup_run (
    run_id uuid,
    started_at timestamp without time zone not null default now(),
    package_id varchar not null,
    delete_before timestamp without time zone not null,
    status varchar not null,
    details varchar,
    deleted_items integer
);

alter table versions_cleanup_run add constraint PK_versions_cleanup_run primary key (run_id);

alter table versions_cleanup_run
    add constraint versions_cleanup_run_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;