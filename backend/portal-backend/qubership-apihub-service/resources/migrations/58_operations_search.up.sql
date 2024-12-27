CREATE TABLE ts_operation_data(
    data_hash varchar NOT NULL,
    scope_all tsvector,
    scope_request tsvector,
    scope_response tsvector,
    scope_annotation tsvector,
    scope_properties tsvector,
    scope_examples tsvector,
    CONSTRAINT pk_ts_operation_data PRIMARY KEY(data_hash)
);

ALTER TABLE ts_operation_data ADD CONSTRAINT "FK_operation_data"
    FOREIGN KEY (data_hash) REFERENCES operation_data (data_hash) ON DELETE Cascade ON UPDATE Cascade;

insert into ts_operation_data
select data_hash,
to_tsvector(jsonb_extract_path_text(search_scope, 'all')) scope_all,
to_tsvector(jsonb_extract_path_text(search_scope, 'request')) scope_request,
to_tsvector(jsonb_extract_path_text(search_scope, 'response')) scope_response,
to_tsvector(jsonb_extract_path_text(search_scope, 'annotation')) scope_annotation,
to_tsvector(jsonb_extract_path_text(search_scope, 'properties')) scope_properties,
to_tsvector(jsonb_extract_path_text(search_scope, 'examples')) scope_examples
from operation_data;

CREATE INDEX ts_operation_data_idx 
ON ts_operation_data
USING gin(scope_request,scope_response,scope_annotation,scope_properties,scope_examples) 
with (fastupdate = true);