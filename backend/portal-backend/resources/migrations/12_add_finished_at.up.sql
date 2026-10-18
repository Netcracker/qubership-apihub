ALTER TABLE versions_cleanup_run
    add finished_at TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE comparisons_cleanup_run
    add finished_at TIMESTAMP WITHOUT TIME ZONE;