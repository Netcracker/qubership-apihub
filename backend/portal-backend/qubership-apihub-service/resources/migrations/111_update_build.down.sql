create table builder_task
(
    build_id   varchar           not null
        constraint "PK_builder_task"
            primary key
        constraint "FK_builder_task_build_id"
            references build
            on update cascade on delete cascade,
    builder_id varchar           not null,
    version    integer default 1 not null
);

insert into builder_task select build_id, builder_id from build where build.builder_id!='';

alter table build drop builder_id;

alter table build drop priority;
