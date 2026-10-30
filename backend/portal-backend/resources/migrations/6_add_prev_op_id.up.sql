alter table operation_comparison
    alter column operation_id drop not null;

alter table operation_comparison
    add previous_operation_id varchar;

