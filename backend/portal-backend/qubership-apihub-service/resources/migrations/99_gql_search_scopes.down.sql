drop index ts_graphql_operation_data_idx;
drop table ts_graphql_operation_data;

alter table ts_rest_operation_data add column scope_all tsvector;

drop index ts_operation_data_idx;

update ts_rest_operation_data r_od set scope_all = (select scope_all from ts_operation_data od where od.data_hash = r_od.data_hash);

drop table  ts_operation_data;

alter table ts_rest_operation_data rename constraint pk_ts_rest_operation_data to pk_ts_operation_data;
alter index ts_rest_operation_data_idx rename to ts_operation_data_idx;
alter table ts_rest_operation_data rename to ts_operation_data;