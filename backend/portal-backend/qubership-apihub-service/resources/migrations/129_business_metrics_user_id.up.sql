alter table business_metric add column user_id varchar default 'unknown';

alter table business_metric drop constraint if exists business_metric_pkey;
alter table business_metric add constraint business_metric_pkey
primary key(year, month, day, metric, user_id);