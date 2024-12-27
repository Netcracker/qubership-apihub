create table migrated_version_changes (
    package_id varchar not null,
    version varchar not null,
    revision varchar not null,
    build_id varchar not null,
    migration_id varchar not null,
    changes jsonb
);

alter table migration_run add column skip_validation boolean;