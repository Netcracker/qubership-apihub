alter table ts_operation_data rename to ts_rest_operation_data;
alter index ts_operation_data_idx rename to ts_rest_operation_data_idx;
alter table ts_rest_operation_data rename constraint pk_ts_operation_data to pk_ts_rest_operation_data;

CREATE TABLE ts_operation_data(
    data_hash varchar NOT NULL,
    scope_all tsvector,
    CONSTRAINT pk_ts_operation_data PRIMARY KEY(data_hash)
);

insert into ts_operation_data
select data_hash, scope_all from ts_rest_operation_data where scope_all is not null;

CREATE INDEX ts_operation_data_idx 
ON ts_operation_data
USING gin(scope_all) 
with (fastupdate = true);

alter table ts_rest_operation_data drop column scope_all;

CREATE TABLE ts_graphql_operation_data(
    data_hash varchar NOT NULL,
    scope_argument tsvector,
    scope_property tsvector,
    scope_annotation tsvector,
    CONSTRAINT pk_ts_graphql_operation_data PRIMARY KEY(data_hash)
);

CREATE INDEX ts_graphql_operation_data_idx 
ON ts_graphql_operation_data
USING gin(scope_argument, scope_property, scope_annotation) 
with (fastupdate = true);
