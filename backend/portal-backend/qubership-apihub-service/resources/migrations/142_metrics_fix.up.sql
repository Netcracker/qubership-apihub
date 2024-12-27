with migrations as (
    select distinct started_at::date, updated_at::date from migration_run
    where started_at is not null and updated_at is not null
)
delete from business_metric using migrations m
where to_date(year || '-' || month || '-' || day, 'YYYY-MM-DD') between m.started_at and m.updated_at
and metric = 'release_versions_published';