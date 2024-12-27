delete from business_metric where user_id != 'unknown';

alter table business_metric drop column user_id;

alter table business_metric add constraint business_metric_pkey
primary key(year, month, day, metric);