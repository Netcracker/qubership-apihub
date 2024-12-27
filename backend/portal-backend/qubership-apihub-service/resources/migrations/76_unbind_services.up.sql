delete from package_service where package_id in (select id from package_group where deleted_at is not null and service_name is not null);
update package_group set service_name = null where deleted_at is not null and service_name is not null;
