delete from grouped_operation where deleted = true;
alter table grouped_operation drop column deleted;