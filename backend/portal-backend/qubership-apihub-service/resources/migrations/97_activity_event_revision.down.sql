update activity_tracking set data = data::jsonb - 'revision' where e_type = 'publish_new_version';
update activity_tracking set data = data::jsonb - 'revision' where e_type = 'patch_version_meta';
update activity_tracking set data = data::jsonb - 'revision' where e_type = 'delete_version';