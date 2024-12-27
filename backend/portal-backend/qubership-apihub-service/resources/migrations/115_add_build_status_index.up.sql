create index build_status_index on build (status);

create index build_depends_index on build_depends (depend_id);