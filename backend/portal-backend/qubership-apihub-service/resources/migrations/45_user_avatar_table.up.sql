CREATE TABLE user_avatar_data
(
    user_id varchar NOT NULL,
    avatar bytea NULL,
    checksum bytea NULL
)
;

ALTER TABLE user_avatar_data ADD CONSTRAINT "PK_user_avatar_data"
    PRIMARY KEY (user_id)
;