create table personal_access_tokens
(
    id varchar,
    user_id    varchar,
    token_hash varchar,
    name varchar not null,
    created_at timestamp without time zone not null default now(),
    expires_at timestamp without time zone,
    deleted_at timestamp without time zone,
    constraint personal_access_tokens_pk
        primary key (id),
    constraint personal_access_tokens_user_fk
        foreign key (user_id) references user_data (user_id)
);

create unique index personal_access_tokens_hash_index
    on personal_access_tokens (token_hash);

