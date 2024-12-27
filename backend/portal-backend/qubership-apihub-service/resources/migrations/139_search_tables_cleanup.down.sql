CREATE TABLE ts_published_data_path_split
(
    package_id varchar NOT NULL,
    checksum varchar NOT NULL,
    search_vector tsvector,
    unique(package_id, checksum)
);

CREATE TABLE ts_published_data_custom_split
(
    package_id varchar NOT NULL,
    checksum varchar NOT NULL,
    search_vector tsvector,
    unique(package_id, checksum)
);

CREATE TABLE ts_published_data_errors
(
    package_id varchar NOT NULL,
    checksum varchar NOT NULL,
    error varchar,
    unique(package_id, checksum)
);

alter table ts_published_data_errors
    add constraint ts_published_data_errors_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;

alter table ts_published_data_custom_split
    add constraint ts_published_data_custom_split_package_group_id_fk
        foreign key (package_id) references package_group
            on update cascade on delete cascade;


CREATE INDEX ts_published_data_path_split_idx
ON ts_published_data_path_split 
USING gin(search_vector) 
with (fastupdate = true);

CREATE INDEX ts_published_data_custom_split_idx 
ON ts_published_data_custom_split 
USING gin(search_vector) 
with (fastupdate = true);
