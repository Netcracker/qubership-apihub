alter table operation add column if not exists deprecated_info jsonb;
alter table operation add column if not exists deprecated_items jsonb[];
alter table operation add column if not exists previous_release_versions varchar[];
