CREATE TABLE ai_chat (
    id                            uuid        PRIMARY KEY,
    user_id                       varchar     NOT NULL
        CONSTRAINT ai_chat_user_fk REFERENCES user_data(user_id) ON DELETE CASCADE,
    title                         text        NOT NULL DEFAULT '',
    pinned                        boolean     NOT NULL DEFAULT false,
    created_at                    timestamp without time zone NOT NULL,
    last_message_at               timestamp without time zone NOT NULL,
    messages_count                integer     NOT NULL DEFAULT 0,
    compacted_up_to_created_at    timestamp without time zone,
    compaction_summary            text,
    last_turn_tokens              integer
);

CREATE INDEX ai_chat_user_sort_idx
    ON ai_chat (user_id, pinned DESC, last_message_at DESC);

CREATE INDEX ai_chat_retention_idx
    ON ai_chat (user_id, pinned, last_message_at);

CREATE TABLE ai_chat_message (
    id                 uuid        PRIMARY KEY,
    chat_id            uuid        NOT NULL
        CONSTRAINT ai_chat_message_chat_fk REFERENCES ai_chat(id) ON DELETE CASCADE,
    role               varchar     NOT NULL,
    content            text        NOT NULL,
    client_message_id  uuid,
    tool_invocations   jsonb,
    created_at         timestamp without time zone NOT NULL
);

CREATE INDEX ai_chat_message_chat_time_idx
    ON ai_chat_message (chat_id, created_at DESC);

CREATE UNIQUE INDEX ai_chat_message_client_id_idx
    ON ai_chat_message (chat_id, client_message_id)
    WHERE client_message_id IS NOT NULL;

CREATE TABLE ephemeral_file (
    id            uuid        PRIMARY KEY,
    user_id       varchar     NOT NULL,
    filename      text        NOT NULL,
    storage_path  text        NOT NULL,
    mime_type     varchar,
    size_bytes    bigint,
    created_at    timestamp without time zone NOT NULL,
    expires_at    timestamp without time zone NOT NULL
);

CREATE INDEX ephemeral_file_expires_idx ON ephemeral_file (expires_at);
