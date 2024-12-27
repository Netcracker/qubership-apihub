alter table published_version_revision_content
    add constraint published_version_revision_content_pk
        primary key (package_id, version, revision, file_id);