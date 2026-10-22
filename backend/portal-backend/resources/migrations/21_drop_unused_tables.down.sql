CREATE TABLE IF NOT EXISTS public.project (
     id character varying NOT NULL,
     name character varying NOT NULL,
     alias character varying NOT NULL,
     group_id character varying,
     description text,
     integration_type character varying,
     default_branch character varying,
     default_folder character varying,
     repository_id character varying,
     deleted_at timestamp without time zone,
     repository_name character varying,
     repository_url character varying,
     deleted_by character varying,
     package_id character varying,
     secret_token character varying,
     secret_token_user_id character varying,
     CONSTRAINT "PK_project" PRIMARY KEY (id)
);
COMMENT ON COLUMN public.project.group_id IS 'Only for the GROUP kind';
COMMENT ON COLUMN public.project.integration_type IS 'GitLab / Local storage';

CREATE TABLE IF NOT EXISTS public.user_integration (
    user_id character varying NOT NULL,
    integration_type character varying NOT NULL,
    key text,
    is_revoked boolean DEFAULT false,
    refresh_token character varying,
    expires_at timestamp without time zone,
    redirect_uri character varying,
    failed_refresh_attempts integer DEFAULT 0,
    CONSTRAINT "PK_user_integration" PRIMARY KEY (user_id, integration_type)
);
COMMENT ON COLUMN public.user_integration.integration_type IS 'GitLab';

CREATE TABLE IF NOT EXISTS public.drafted_branches (
    project_id character varying NOT NULL,
    branch_name character varying NOT NULL,
    change_type character varying,
    original_config bytea,
    editors character varying[],
    commit_id character varying,
    CONSTRAINT drafted_branches_pkey PRIMARY KEY (project_id, branch_name),
    CONSTRAINT "FK_project" FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.branch_draft_content (
    project_id character varying NOT NULL,
    branch_name character varying NOT NULL,
    index integer DEFAULT 0 NOT NULL,
    name character varying,
    file_id character varying NOT NULL,
    path character varying,
    data_type character varying,
    data bytea,
    media_type character varying NOT NULL,
    status character varying,
    moved_from character varying,
    commit_id character varying,
    publish boolean,
    labels character varying[],
    last_status character varying,
    conflicted_commit_id character varying,
    conflicted_file_id character varying,
    included boolean DEFAULT false,
    is_folder boolean,
    from_folder boolean,
    blob_id character varying,
    conflicted_blob_id character varying,
    CONSTRAINT "PK_branch_draft_content" PRIMARY KEY (project_id, branch_name, file_id),
    CONSTRAINT "FK_project" FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE ON UPDATE CASCADE
);
COMMENT ON COLUMN public.branch_draft_content.data_type IS 'OpenAPI / Swagger / MD';
COMMENT ON COLUMN public.branch_draft_content.media_type IS 'HTTP media-type';

CREATE TABLE IF NOT EXISTS public.branch_draft_reference (
    project_id character varying NOT NULL,
    branch_name character varying NOT NULL,
    reference_package_id character varying NOT NULL,
    reference_version character varying NOT NULL,
    status character varying,
    CONSTRAINT "PK_branch_draft_reference" PRIMARY KEY (branch_name, project_id, reference_package_id, reference_version),
    CONSTRAINT "FK_project" FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.favorite_projects (
    user_id character varying NOT NULL,
    project_id character varying NOT NULL,
    CONSTRAINT "PK_favorite_projects" PRIMARY KEY (user_id, project_id),
    CONSTRAINT "FK_favorite_projects_project" FOREIGN KEY (project_id) REFERENCES public.project(id) ON DELETE CASCADE,
    CONSTRAINT "FK_favorite_projects_user_data" FOREIGN KEY (user_id) REFERENCES public.user_data(user_id) ON DELETE CASCADE
);

ALTER TABLE public.package_group
    ADD COLUMN image_url varchar;
