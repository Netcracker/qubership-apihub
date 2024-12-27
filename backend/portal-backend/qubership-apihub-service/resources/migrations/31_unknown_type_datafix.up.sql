update published_version_revision_content
set data_type = 'unknown' where data_type = 'unknown-yaml' or data_type = 'unknown-json' or data_type = 'unknown-text';