update role
set permissions = ARRAY['read', 'manage_draft_version', 'manage_release_candidate_version', 'manage_archived_version', 'manage_deprecated_version']
where id = 'editor';