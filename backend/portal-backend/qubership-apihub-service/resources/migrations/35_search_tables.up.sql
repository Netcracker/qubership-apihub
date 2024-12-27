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