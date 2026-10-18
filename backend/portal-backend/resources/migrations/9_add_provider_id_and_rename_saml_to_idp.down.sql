UPDATE external_identity SET provider = 'saml' WHERE provider = 'idp';

DELETE FROM external_identity WHERE provider_id != '';

ALTER TABLE external_identity DROP CONSTRAINT IF EXISTS external_identity_pkey;
ALTER TABLE external_identity ADD CONSTRAINT external_identity_pkey PRIMARY KEY (provider, external_id);

ALTER TABLE external_identity DROP COLUMN IF EXISTS provider_id;
