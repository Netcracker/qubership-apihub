create table activity_tracking
(
    id varchar not null,
    e_type varchar not null,
    data jsonb,
    package_id varchar,
    version varchar,
    date timestamp without time zone,
    user_id varchar,

    PRIMARY KEY(id)
);