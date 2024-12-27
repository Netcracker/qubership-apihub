CREATE TABLE agent
(
    agent_id         varchar                     NOT NULL,
    cloud            varchar                     NOT NULL,
    namespace        varchar                     NOT NULL,
    url              varchar                     NOT NULL,
    last_active      timestamp without time zone NOT NULL,
    backend_version  varchar                     NOT NULL,
    frontend_version varchar                     NOT NULL,
    name             varchar,
    PRIMARY KEY (agent_id)
);