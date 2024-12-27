with comp as (
    select 
	comparison_id,
	md5(package_id||'@'||version||'@'||revision||'@'||previous_package_id||'@'||previous_version||'@'||previous_revision) as new_comparison_id 
	from version_comparison 
    where comparison_id != md5(package_id||'@'||version||'@'||revision||'@'||previous_package_id||'@'||previous_version||'@'||previous_revision)
)
update version_comparison b set refs = array_replace(refs, c.comparison_id, c.new_comparison_id::varchar)
from comp c
where c.comparison_id = any(refs);

with comp as (
    select 
	comparison_id,
	md5(package_id||'@'||version||'@'||revision||'@'||previous_package_id||'@'||previous_version||'@'||previous_revision) as new_comparison_id 
	from version_comparison 
    where comparison_id != md5(package_id||'@'||version||'@'||revision||'@'||previous_package_id||'@'||previous_version||'@'||previous_revision)
)
update version_comparison b set comparison_id = c.new_comparison_id::varchar
from comp c
where c.comparison_id = b.comparison_id;