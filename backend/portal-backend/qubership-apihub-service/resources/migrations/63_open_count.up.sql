create table published_version_open_count 
(
    package_id varchar not null,
    version varchar not null,
    open_count bigint,
    PRIMARY KEY(package_id, version) 
);

create table published_document_open_count 
(
    package_id varchar not null,
    version varchar not null,
    slug varchar not null,
    open_count bigint,
    PRIMARY KEY(package_id, version, slug)
);

create table operation_open_count 
(
    package_id varchar not null,
    version varchar not null,
    operation_id varchar not null,
    open_count bigint,
    PRIMARY KEY(package_id, version, operation_id) 
);
