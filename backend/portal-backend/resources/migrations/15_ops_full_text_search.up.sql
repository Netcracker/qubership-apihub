CREATE TABLE IF NOT EXISTS fts_operation_data
(
    data_hash   character varying NOT NULL,
    data_vector tsvector,
    CONSTRAINT pk_fts_operation_data PRIMARY KEY (data_hash)
);

CREATE INDEX fts_operation_data_data_vector_index
    ON fts_operation_data
        USING gin ("data_vector");

insert into fts_operation_data
select data_hash,
       to_tsvector(convert_from(data,'UTF-8'))  data_vector
from operation_data
on conflict (data_hash) do update set data_vector = EXCLUDED.data_vector;
