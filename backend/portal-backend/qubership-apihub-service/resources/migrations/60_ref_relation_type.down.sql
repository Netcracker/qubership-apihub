ALTER TABLE published_version_reference ADD COLUMN relation_type varchar;

with pkggroup as (
    select id as package_id from package_group where kind = 'group'
)
update published_version_reference pvr
set relation_type = 'import'
    from pkggroup
    where pvr.package_id = pkggroup.package_id;

with  pkgnotgroup as (
    select id as package_id from package_group where kind != 'group'
)
update published_version_reference pvr
set relation_type = 'depend'
    from pkgnotgroup
where pvr.package_id = pkgnotgroup.package_id;

ALTER TABLE published_version_reference DROP CONSTRAINT "PK_published_version_reference";
ALTER TABLE published_version_reference ADD CONSTRAINT "PK_published_version_reference"
    PRIMARY KEY (package_id,version,revision,reference_id,relation_type,reference_version)
;
