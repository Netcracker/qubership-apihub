alter table published_sources DROP CONSTRAINT IF EXISTS published_sources_published_sources_archives_checksum_fk;

alter table published_sources drop column archive_checksum;

drop table published_sources_archives;

delete from published_sources
where (package_id, checksum) in
(
    select package_id, checksum from published_sources
    except
    select package_id, checksum from published_sources_data
);

delete from published_sources where checksum is null;

alter table published_sources
    add constraint "FK_published_sources_data"
        foreign key (checksum, package_id) references published_sources_data;

alter table published_sources
    alter column checksum set not null;
