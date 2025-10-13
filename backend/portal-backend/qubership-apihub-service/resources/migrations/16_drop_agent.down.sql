CREATE TABLE IF NOT EXISTS public.agent
(
    agent_id        character varying           NOT NULL,
    cloud           character varying           NOT NULL,
    namespace       character varying           NOT NULL,
    url             character varying           NOT NULL,
    last_active     timestamp without time zone NOT NULL,
    backend_version character varying           NOT NULL,
    name            character varying,
    agent_version   character varying,
    CONSTRAINT agent_pkey PRIMARY KEY (agent_id)
);
