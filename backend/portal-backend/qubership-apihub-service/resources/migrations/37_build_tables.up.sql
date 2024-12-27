CREATE TABLE build
(
    build_id    varchar NOT NULL,
    status      varchar NOT NULL,
    details     varchar NULL,
    package_id  varchar NOT NULL,
    version     varchar NOT NULL,
    created_at  timestamp without time zone NOT NULL,
    last_active timestamp without time zone NOT NULL,
    created_by varchar NOT NULL,
    restart_count integer
);
ALTER TABLE build ADD CONSTRAINT "PK_build" PRIMARY KEY (build_id);


CREATE TABLE build_src
(
    build_id varchar NOT NULL,
    source   bytea   NULL,
    config   jsonb   NOT NULL
);

ALTER TABLE build_src
    ADD CONSTRAINT "FK_build_src"
        FOREIGN KEY (build_id) REFERENCES build (build_id) ON DELETE Cascade ON UPDATE Cascade
;


CREATE TABLE build_depends
(
    build_id  varchar NOT NULL,
    depend_id varchar NOT NULL
);

ALTER TABLE build_depends
    ADD CONSTRAINT "FK_build_depends_id"
        FOREIGN KEY (build_id) REFERENCES build (build_id) ON DELETE Cascade ON UPDATE Cascade
;
ALTER TABLE build_depends
    ADD CONSTRAINT "FK_build_depends_depend"
        FOREIGN KEY (depend_id) REFERENCES build (build_id) ON DELETE Cascade ON UPDATE Cascade
;