DROP TABLE IF EXISTS published_content_messages CASCADE;

create table published_content_messages
(
    checksum     varchar not null,
    messages    jsonb
);

ALTER TABLE published_content_messages ADD CONSTRAINT "PK_published_content_messages"
    PRIMARY KEY (checksum)
;
