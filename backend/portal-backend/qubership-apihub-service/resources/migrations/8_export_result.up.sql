create table export_result
(
    export_id character varying
        constraint export_result_pk
            primary key,
    created_at timestamp without time zone not null,
    created_by character varying not null,
    config    json  not null,
    filename character varying not null,
    data      bytea not null
);
