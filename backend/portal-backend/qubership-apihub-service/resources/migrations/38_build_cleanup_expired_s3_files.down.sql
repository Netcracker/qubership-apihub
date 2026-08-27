ALTER TABLE build_cleanup_run
    DROP COLUMN IF EXISTS expired_s3_files_count,
    DROP COLUMN IF EXISTS expired_s3_files_details;
