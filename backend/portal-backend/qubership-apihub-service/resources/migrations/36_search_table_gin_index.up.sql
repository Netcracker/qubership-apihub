CREATE INDEX ts_published_data_path_split_idx
ON ts_published_data_path_split 
USING gin(search_vector) 
with (fastupdate = true);

CREATE INDEX ts_published_data_custom_split_idx 
ON ts_published_data_custom_split 
USING gin(search_vector) 
with (fastupdate = true);
