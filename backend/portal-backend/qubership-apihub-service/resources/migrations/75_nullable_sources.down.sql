delete from published_sources_data where data is null;
alter table published_sources_data alter column data set not null;