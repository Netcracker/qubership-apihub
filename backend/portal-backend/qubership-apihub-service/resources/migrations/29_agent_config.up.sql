CREATE TABLE agent_config
(
    cloud varchar NOT NULL,
    namespace varchar NOT NULL,
    config jsonb
);

ALTER TABLE agent_config ADD CONSTRAINT "PK_agent_config"
    PRIMARY KEY (cloud, namespace)
;