ALTER TABLE external_identity DROP CONSTRAINT IF EXISTS external_identity_pkey;
ALTER TABLE external_identity ADD COLUMN IF NOT EXISTS provider_id character varying NOT NULL DEFAULT '';
ALTER TABLE external_identity ADD CONSTRAINT external_identity_pkey PRIMARY KEY (provider, provider_id, external_id);

UPDATE external_identity SET provider = 'idp' WHERE provider = 'saml';
