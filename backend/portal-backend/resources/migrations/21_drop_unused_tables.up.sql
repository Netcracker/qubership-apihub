DROP TABLE IF EXISTS public.branch_draft_reference;
DROP TABLE IF EXISTS public.branch_draft_content;
DROP TABLE IF EXISTS public.drafted_branches;
DROP TABLE IF EXISTS public.user_integration;
DROP TABLE IF EXISTS public.favorite_projects;
DROP TABLE IF EXISTS public.project;

ALTER TABLE public.package_group
    DROP COLUMN image_url;
