alter table published_version_reference
add column reference_revision integer not null default 0,
add column parent_reference_id varchar not null default '',
add column parent_reference_version varchar not null default '',
add column parent_reference_revision integer not null default 0;

ALTER TABLE published_version_reference DROP CONSTRAINT if exists "PK_published_version_reference";
ALTER TABLE published_version_reference ADD CONSTRAINT "PK_published_version_reference"
    PRIMARY KEY (
        package_id,
        version,
        revision,
        reference_id,
        reference_version,
        reference_revision,
        parent_reference_id,
        parent_reference_version,
        parent_reference_revision)
        ;

--set latest revisions for all references
update published_version_reference r set reference_revision = maxrev.revision
from 
(
    select package_id, version, max(revision) as revision from published_version
    group by package_id, version
) maxrev
where maxrev.package_id = r.reference_id
and maxrev.version = r.reference_version;

--calculate references tree and store it in a flat way preserving parent link
insert into published_version_reference
with recursive rec as (
			select 0 as depth, s.package_id, s.version, s.revision, ''::varchar as parent_id, ''::varchar as parent_version, 0 as parent_revision,
            s.package_id root_package_id, s.version root_version, s.revision root_revision
			from published_version_reference s
			inner join published_version_reference t
            on s.package_id = t.package_id
            and s.version = t.version
            and s.revision = t.revision
            where s.parent_reference_id = ''
			union
			select rec.depth+1 as depth, s.reference_id as package_id, s.reference_version as version, s.revision,
            rec.package_id as parent_id, rec.version as parent_version, rec.revision as parent_revision,
            rec.root_package_id root_package_id, rec.root_version root_version, rec.root_revision root_revision
			from published_version_reference s
			inner join rec 
			on rec.package_id = s.package_id
			and rec.version = s.version
			and rec.revision = s.revision
            where s.parent_reference_id = ''
)
select r.root_package_id as package_id, r.root_version as version, r.root_revision as revision, 
r.package_id as reference_id, r.version as reference_version, r.revision as reference_revision,
r.parent_id as parent_reference_id, r.parent_version as parent_reference_version, r.parent_revision as parent_reference_revision
from rec r
where r.depth > 0
and not (r.parent_id = r.root_package_id and r.parent_version = r.root_version and r.parent_revision = r.root_revision);
