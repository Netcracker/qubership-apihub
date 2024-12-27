ALTER TABLE project 
    ADD COLUMN kind varchar,
    ADD COLUMN image_url varchar;

ALTER TABLE project
    DROP COLUMN deleted_by;

ALTER TABLE project
    RENAME COLUMN group_id to parent_id;
ALTER TABLE project
    RENAME COLUMN deleted_at to delete_date;

ALTER TABLE branch_draft_reference
    RENAME COLUMN reference_package_id to reference_project_id;

ALTER TABLE favorites RENAME to favorite_projects;

ALTER TABLE favorite_projects
    RENAME COLUMN id to project_id;

ALTER TABLE published_version
    RENAME COLUMN package_id to project_id;
ALTER TABLE published_version
    RENAME COLUMN published_at to publish_date;
ALTER TABLE published_version
    RENAME COLUMN deleted_at to delete_date;

ALTER TABLE published_version_revision_content
    RENAME COLUMN package_id to project_id;

ALTER TABLE published_data
    RENAME COLUMN package_id to project_id;

ALTER TABLE published_version_reference
    RENAME COLUMN package_id to project_id;
    
ALTER TABLE shared_url_info
    RENAME COLUMN package_id to project_id;

ALTER TABLE published_sources
    RENAME COLUMN package_id to project_id;

ALTER TABLE published_sources_data
    RENAME COLUMN package_id to project_id;
        
ALTER TABLE apihub_api_keys
    RENAME COLUMN package_id to project_id;