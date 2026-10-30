CREATE TABLE IF NOT EXISTS published_version_notification
(
    id          bigint GENERATED ALWAYS AS IDENTITY,
    package_id  varchar NOT NULL,
    version     varchar NOT NULL,
    revision    integer NOT NULL,
    severity    varchar NOT NULL,
    category    varchar NOT NULL,
    message     varchar NOT NULL,
    document_id varchar,
    CONSTRAINT pk_published_version_notification PRIMARY KEY (id),
    CONSTRAINT fk_published_version_notification FOREIGN KEY (package_id, version, revision)
        REFERENCES published_version (package_id, version, revision) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Serves the reads by version and, more importantly, the foreign key: Postgres indexes the referenced side
-- only, so without this a cascading delete of a version scans the whole table.
CREATE INDEX IF NOT EXISTS published_version_notification_version_idx
    ON published_version_notification (package_id, version, revision);

CREATE TABLE IF NOT EXISTS version_comparison_notification
(
    id                  bigint GENERATED ALWAYS AS IDENTITY,
    package_id          varchar NOT NULL,
    version             varchar NOT NULL,
    revision            integer NOT NULL,
    previous_package_id varchar NOT NULL,
    previous_version    varchar NOT NULL,
    previous_revision   integer NOT NULL,
    comparison_id       varchar NOT NULL,
    severity            varchar NOT NULL,
    category            varchar NOT NULL,
    message             varchar NOT NULL,
    document_id         varchar,
    CONSTRAINT pk_version_comparison_notification PRIMARY KEY (id),
    CONSTRAINT version_comparison_notification_comparison_id_fk FOREIGN KEY (comparison_id)
        REFERENCES version_comparison (comparison_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Required by the comparison_id foreign key: Postgres indexes the referenced side only, so without this a
-- cascading delete of a comparison scans the whole table.
CREATE INDEX IF NOT EXISTS version_comparison_notification_comparison_id_idx
    ON version_comparison_notification (comparison_id);

DROP TABLE IF EXISTS builder_notifications;

-- Messages of a build that failed. A failed build publishes no version, so its messages cannot go to
-- published_version_notification; they are kept against the build and removed with its sources by the
-- build cleanup job.
CREATE TABLE IF NOT EXISTS error_build_notification
(
    id          bigint GENERATED ALWAYS AS IDENTITY,
    build_id    varchar NOT NULL,
    severity    varchar NOT NULL,
    category    varchar NOT NULL,
    message     varchar NOT NULL,
    document_id varchar,
    CONSTRAINT pk_error_build_notification PRIMARY KEY (id),
    CONSTRAINT error_build_notification_build_id_fk FOREIGN KEY (build_id)
        REFERENCES build (build_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Serves the reads by build and the build_id foreign key: Postgres indexes the referenced side only, so without
-- this a cascading delete of a build scans the whole table.
CREATE INDEX IF NOT EXISTS error_build_notification_build_id_idx
    ON error_build_notification (build_id);

ALTER TABLE build_cleanup_run
    ADD COLUMN IF NOT EXISTS error_build_notification integer DEFAULT 0;
