ALTER TABLE versions_cleanup_run
    drop column finished_at;

ALTER TABLE comparisons_cleanup_run
    drop column finished_at;