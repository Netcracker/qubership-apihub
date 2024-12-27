alter table migrated_version_changes add column unique_changes varchar[];
create table migration_changes(
    migration_id varchar,
    changes jsonb,
    PRIMARY KEY(migration_id));