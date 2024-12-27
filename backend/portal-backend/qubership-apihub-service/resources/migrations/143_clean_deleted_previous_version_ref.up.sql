update published_version pv
set previous_version = null, previous_version_package_id = null
from (
	with deleted_versions as (
	    select d.deleted_version as "version", d.dv_package_id as package_id from (
	        with dv as (select distinct pv2."version" as deleted_version, pv2.package_id as dv_package_id from published_version pv2 where pv2.deleted_at is not null),
	        ndv as (select distinct pv2."version" as not_deleted_version, pv2.package_id as ndv_package_id from published_version pv2 where pv2.deleted_at is null)
	        select * from dv 
	        left join ndv 
	        on dv.deleted_version = ndv.not_deleted_version and dv.dv_package_id = ndv.ndv_package_id
	    ) as d
	    where d.not_deleted_version is null and d.ndv_package_id is null) 
	select pv.package_id, pv."version", revision from published_version pv
	join deleted_versions on
	pv.previous_version = deleted_versions."version" 
	and (pv.previous_version_package_id = deleted_versions.package_id 
		or 
		(pv.package_id = deleted_versions.package_id and (pv.previous_version_package_id = '' or pv.previous_version_package_id is null)))
	where pv.deleted_at is null
) d
where pv.package_id = d.package_id and pv."version" = d."version" and pv.revision = d.revision;

update published_version pv
set previous_version = null, previous_version_package_id = null
from (
    select package_id, "version", revision from published_version pv
    where pv."version" = pv.previous_version 
    and deleted_at is null 
    and (pv.package_id = pv.previous_version_package_id or pv.previous_version_package_id is null or pv.previous_version_package_id = '')
) eqv
where pv.package_id = eqv.package_id and pv."version" = eqv."version" and pv.revision = eqv.revision;