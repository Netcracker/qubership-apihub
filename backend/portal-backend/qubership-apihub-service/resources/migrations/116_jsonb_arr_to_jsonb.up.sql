alter table version_comparison alter column operation_types type jsonb using to_jsonb(operation_types);
alter table transformed_content_data alter column documents_info type jsonb using to_jsonb(documents_info);
alter table operation alter column deprecated_items type jsonb using to_jsonb(deprecated_items);