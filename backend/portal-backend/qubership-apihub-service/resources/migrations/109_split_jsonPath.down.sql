update operation
set deprecated_items = merge_json_path(deprecated_items)
where deprecated_items != '{}';

drop function if exists split_json_path;
drop function if exists merge_json_path;