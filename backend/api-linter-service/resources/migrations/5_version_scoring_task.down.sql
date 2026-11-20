delete from version_score
where coalesce(process_details ->> 'processStatus', '') not in ('success', 'error');

alter table version_score
    add column backward_compatibility_details jsonb,
    add column quality_check_details          jsonb,
    add column publication_integrity_details  jsonb;

update version_score
set backward_compatibility_details = process_details -> 'backwardsCompatibility' -> 'details',
    quality_check_details          = process_details -> 'qualityCheck' -> 'details',
    publication_integrity_details  = case
        when process_details -> 'publicationIntegrity' ->> 'processStatus' = 'error'
            and process_details -> 'publicationIntegrity' -> 'details' is null
            then jsonb_build_object(
                'status', 'not_passed',
                'reason', 'Internal error: failed to get version content.',
                'hasErrors', false,
                'changelogHasErrors', false
            )
        else process_details -> 'publicationIntegrity' -> 'details'
    end;

alter table version_score
    drop column if exists process_details,
    drop column if exists validation_process_id;

alter table linted_version
    drop column if exists validation_process_id;

drop table if exists version_scoring_task;

alter table version_lint_task
    drop column if exists validation_process_id;

drop table if exists version_validation_process;
