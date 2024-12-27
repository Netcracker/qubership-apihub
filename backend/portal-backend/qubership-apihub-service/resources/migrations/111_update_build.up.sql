alter table build add builder_id varchar;

update build set builder_id = (select builder_id from builder_task where builder_task.build_id=build.build_id);

drop table builder_task;

alter table build add priority int not null default 0;


