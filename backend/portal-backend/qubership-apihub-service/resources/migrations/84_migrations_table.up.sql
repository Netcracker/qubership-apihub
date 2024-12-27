create table if not exists stored_schema_migration
(
    num integer not null,
    up_hash varchar not null,
    sql_up varchar not null,
    down_hash varchar null,
    sql_down varchar null,
    PRIMARY KEY(num)
);