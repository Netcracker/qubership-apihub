alter table operation_group add column template bytea;

update operation_group og set template = (select template from operation_group_template ogt where checksum = og.template_checksum)
where template_checksum != '' and template_checksum is not null;

alter table operation_group drop column template_checksum;

drop table operation_group_template;