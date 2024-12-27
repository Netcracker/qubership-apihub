create table published_sources_archives
(
    checksum varchar
        constraint published_sources_archives_pk
            primary key,
    data     bytea
);

alter table published_sources
    add archive_checksum varchar;

alter table published_sources
    drop constraint "FK_published_sources_data";

alter table published_sources
    alter column checksum drop not null;

