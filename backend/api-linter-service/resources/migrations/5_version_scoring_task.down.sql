delete from version_score
where process_status not in ('success', 'error');

alter table version_score
    drop column if exists validation_process_id,
    drop column if exists process_status,
    drop column if exists publication_integrity_status,
    drop column if exists publication_integrity_error,
    drop column if exists backward_compatibility_status,
    drop column if exists backward_compatibility_error,
    drop column if exists quality_check_status,
    drop column if exists quality_check_error;

alter table linted_version
    drop column if exists validation_process_id;

drop table if exists version_scoring_task;

alter table version_lint_task
    drop column if exists validation_process_id;

drop table if exists version_validation_process;
