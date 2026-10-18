DROP INDEX IF EXISTS public.comparison_internal_document_hash_idx;
DROP TABLE IF EXISTS public.comparison_internal_document CASCADE;
DROP TABLE IF EXISTS public.comparison_internal_document_data CASCADE;
DROP INDEX IF EXISTS public.version_internal_document_hash_idx;
DROP TABLE IF EXISTS public.version_internal_document CASCADE;
DROP TABLE IF EXISTS public.version_internal_document_data CASCADE;

ALTER TABLE operation
    DROP COLUMN version_internal_document_id;

ALTER TABLE operation_comparison
    DROP COLUMN comparison_internal_document_id;
