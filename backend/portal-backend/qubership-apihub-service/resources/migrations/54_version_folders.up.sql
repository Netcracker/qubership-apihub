update published_version
set labels = labels || folder
where folder is not null
and folder != any(labels);

update published_version
set labels = ARRAY[folder]
where folder is not null
and labels is null;

alter table published_version drop column folder;