update package_group
set release_version_pattern = '^[0-9]{4}[.]{1}[1-4]{1}$'
where (kind = 'package' or kind = 'dashboard') and (release_version_pattern = '' or release_version_pattern is null);
