CREATE TABLE IF NOT EXISTS public.sources_update_tracking (
    id character varying NOT NULL,
    package_id character varying NOT NULL,
    version character varying NOT NULL,
    revision integer NOT NULL,
    old_checksum character varying NOT NULL,
    new_checksum character varying NOT NULL,
    performed_by character varying NOT NULL,
    performed_at timestamp without time zone NOT NULL,
    CONSTRAINT sources_update_tracking_pk PRIMARY KEY (id)
);
