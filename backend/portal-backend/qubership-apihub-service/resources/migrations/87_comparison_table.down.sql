alter table operation_comparison rename to changed_operation;

alter table changed_operation drop constraint "FK_version_comparison";

alter table changed_operation drop column comparison_id;

drop table version_comparison;

truncate table changed_operation;