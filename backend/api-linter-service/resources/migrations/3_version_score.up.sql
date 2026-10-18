create table version_score
(
    package_id                     varchar                     not null,
    version                        varchar                     not null,
    revision                       integer                     not null,
    scored_at                      timestamp without time zone not null,
    status                         varchar                     not null,
    reasons                        character varying ARRAY,
    debug                          character varying ARRAY,
    backward_compatibility_details jsonb,
    quality_check_details          jsonb,

    constraint version_score_pk
        primary key (package_id, version, revision)
);