ALTER TABLE build_cleanup_run
    ADD COLUMN IF NOT EXISTS expired_s3_files_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS expired_s3_files_details TEXT DEFAULT '';
