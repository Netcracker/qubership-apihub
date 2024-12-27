update activity_tracking set data = jsonb_set(data, '{revision}',to_jsonb(1)) where e_type = 'publish_new_version';

update activity_tracking as at set data = jsonb_set(data, '{revision}',to_jsonb((select revision from published_version as pv where pv.version = at.data #>> '{version}' and pv.package_id = at.package_id order by revision desc  limit 1)))
where e_type = 'patch_version_meta';

update activity_tracking as at set data = jsonb_set(data, '{revision}',to_jsonb((select revision from published_version as pv where pv.version = at.data #>> '{version}' and pv.package_id = at.package_id order by revision desc  limit 1)))
where e_type = 'delete_version';
