ALTER TABLE public.published_version_revision_content
ADD COLUMN IF NOT EXISTS api_kind character varying;
