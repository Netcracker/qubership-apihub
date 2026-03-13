ALTER TABLE public.published_version_revision_content
ADD COLUMN IF NOT EXISTS shareability character varying NOT NULL DEFAULT 'unknown';

UPDATE role SET permissions = array_append(permissions, 'document_shareability_management')
WHERE id IN ('admin', 'owner');
