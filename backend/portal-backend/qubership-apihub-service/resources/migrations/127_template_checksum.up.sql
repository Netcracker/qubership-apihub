create table operation_group_template (
    checksum varchar,
    template bytea,
    PRIMARY KEY (checksum)
);

insert into operation_group_template
select distinct md5(template), template from operation_group where template is not null; 

alter table operation_group alter column template type varchar using md5(template);
alter table operation_group rename column template to template_checksum;