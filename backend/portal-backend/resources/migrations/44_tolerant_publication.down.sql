ALTER TABLE build_cleanup_run
    DROP COLUMN IF EXISTS error_build_notification;

DROP TABLE IF EXISTS error_build_notification;

CREATE TABLE IF NOT EXISTS builder_notifications
(
    build_id character varying NOT NULL,
    severity integer,
    message  character varying,
    file_id  character varying,
    CONSTRAINT builder_notifications_build_id_fkey FOREIGN KEY (build_id)
        REFERENCES build (build_id) ON DELETE CASCADE ON UPDATE CASCADE
);

DROP TABLE IF EXISTS version_comparison_notification;

DROP TABLE IF EXISTS published_version_notification;
