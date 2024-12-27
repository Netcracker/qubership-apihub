update package_group
set release_version_pattern = null
where release_version_pattern = '^[0-9]{4}[.]{1}[1-4]{1}$' and (kind = 'package' or kind = 'dashboard');
