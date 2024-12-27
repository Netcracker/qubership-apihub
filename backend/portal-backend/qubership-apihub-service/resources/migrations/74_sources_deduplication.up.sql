truncate table published_sources_data cascade;
truncate table published_sources cascade;

alter table published_sources add column config bytea;
alter table published_sources add column metadata bytea;