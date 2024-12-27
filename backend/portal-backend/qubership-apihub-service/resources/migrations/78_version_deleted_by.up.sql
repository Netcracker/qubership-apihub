alter table published_version add column deleted_by varchar default null;

update published_version set deleted_by = 'unknown' where deleted_at is not null;