delete from version_score
where process_status <> 'completed';

alter table version_score
    drop column if exists scoring_task_id,
    drop column if exists process_status,
    drop column if exists publication_integrity_status,
    drop column if exists publication_integrity_error,
    drop column if exists backward_compatibility_status,
    drop column if exists backward_compatibility_error,
    drop column if exists quality_check_status,
    drop column if exists quality_check_error;

drop table if exists version_scoring_task;
