UPDATE role SET permissions = array_remove(permissions, 'document_shareability_management')
WHERE id IN ('admin', 'owner');

ALTER TABLE public.published_version_revision_content
DROP COLUMN IF EXISTS shareability;
