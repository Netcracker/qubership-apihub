alter table build_cleanup_run 
drop column if exists build_result,
drop column if exists build_src,
drop column if exists operation_data,
drop column if exists ts_operation_data,
drop column if exists ts_rest_operation_data,
drop column if exists ts_gql_operation_data;