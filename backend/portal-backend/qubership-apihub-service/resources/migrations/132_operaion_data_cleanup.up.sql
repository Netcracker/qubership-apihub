alter table build_cleanup_run 
add column if not exists build_result integer default 0,
add column if not exists build_src integer default 0,
add column if not exists operation_data integer default 0,
add column if not exists ts_operation_data integer default 0,
add column if not exists ts_rest_operation_data integer default 0,
add column if not exists ts_gql_operation_data integer default 0;