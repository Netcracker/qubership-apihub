alter table operation_comparison
    alter column operation_id set not null;

alter table operation_comparison
    drop column previous_operation_id;

