--unassign duplicate service_names
with l as (
    select service_name, min(id) as id from package_group
    where service_name is not null and service_name != ''
    group by service_name having count(*) > 1
)
update package_group pg set service_name = null
from l
where l.service_name = pg.service_name
and l.id != pg.id;

delete from package_service ps
using package_group pg
where ps.package_id = pg.id
and pg.service_name is null;

alter table package_service drop constraint "FK_package_group_workspace";

alter table package_service drop constraint "PK_package_service";
alter table package_service add constraint "PK_package_service"
    primary key (package_id, service_name);

alter table package_service drop constraint package_service_workspace_id_service_name_key;

alter table package_service add UNIQUE(service_name);

alter table package_service drop column workspace_id;