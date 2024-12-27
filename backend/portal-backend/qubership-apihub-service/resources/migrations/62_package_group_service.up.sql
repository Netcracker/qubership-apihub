alter table package_group add column service_name varchar;
update package_group pg set service_name = s.service_name
from package_service s
where s.package_id = pg.id;