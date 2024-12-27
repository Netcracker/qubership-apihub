alter table operation drop column if exists deprecated_info;
alter table operation add column if not exists deprecated_info jsonb;