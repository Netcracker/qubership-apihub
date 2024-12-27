alter table version_comparison add column operation_types_arr jsonb[];
update version_comparison set operation_types_arr = array(select jsonb_array_elements(operation_types))::jsonb[];
alter table version_comparison drop column operation_types;
alter table version_comparison rename column operation_types_arr to operation_types;

alter table transformed_content_data add column documents_info_arr jsonb[];
update transformed_content_data set documents_info_arr = array(select jsonb_array_elements(documents_info))::jsonb[];
alter table transformed_content_data drop column documents_info;
alter table transformed_content_data rename column documents_info_arr to documents_info;

alter table operation add column deprecated_items_arr jsonb[];
update operation set deprecated_items_arr = array(select jsonb_array_elements(deprecated_items))::jsonb[];
alter table operation drop column deprecated_items;
alter table operation rename column deprecated_items_arr to deprecated_items;
