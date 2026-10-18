alter table migration_run
    drop column instance_id;

alter table migration_run
    drop constraint migration_run_seq;

alter table migration_run
    drop column sequence_number;

alter table migration_run
    drop column post_check_result;

alter table migration_run
    drop column retry_count;

alter table version_comparison
    drop column metadata;

CREATE TABLE IF NOT EXISTS public.migrated_version (
    package_id character varying,
    version character varying,
    revision integer,
    error character varying,
    build_id character varying,
    migration_id character varying,
    build_type character varying,
    no_changelog boolean,
    CONSTRAINT migrated_version_package_group_id_fk FOREIGN KEY (package_id) REFERENCES public.package_group(id) ON DELETE CASCADE ON UPDATE CASCADE
    );

alter table migration_run
    drop column stages_execution;
