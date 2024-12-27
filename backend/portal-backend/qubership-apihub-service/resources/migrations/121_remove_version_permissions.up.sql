update role set permissions = array_remove(permissions, 'manage_release_candidate_version');
update role set permissions = array_remove(permissions, 'manage_deprecated_version');
