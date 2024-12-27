create table endpoint_calls(
    path varchar not null,
    hash varchar not null,
    options jsonb,
    count integer,
    PRIMARY KEY(path, hash)
);
