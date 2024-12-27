alter table published_version_reference add column excluded boolean default false;

update published_version_reference r set excluded = true
from (
    select 
    distinct on (package_id, version, revision, reference_id)
    package_id, version, revision, reference_id, reference_version, reference_revision, parent_reference_id, parent_reference_version, parent_reference_revision
    from published_version_reference
    order by package_id, version, revision, reference_id, reference_version desc, reference_revision desc
) p
where r.package_id = p.package_id
and r.version = p.version
and r.revision = p.revision
and r.reference_id = p.reference_id

and 
(r.reference_version != p.reference_version
or r.reference_revision != p.reference_revision
or r.parent_reference_id != p.parent_reference_id
or r.parent_reference_version != p.parent_reference_version
or r.parent_reference_revision != p.parent_reference_revision)
;