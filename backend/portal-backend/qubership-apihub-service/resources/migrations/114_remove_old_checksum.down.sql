alter table published_sources
    add checksum varchar;

create table published_sources_data
(
    package_id varchar not null
        constraint published_sources_data_package_group_id_fk
            references package_group
            on update cascade on delete cascade,
    checksum   varchar not null,
    data       bytea,
    constraint "PK_published_sources_data"
        primary key (checksum, package_id)
);