ALTER TABLE project 
    DROP COLUMN kind,
    DROP COLUMN image_url;

ALTER TABLE project
    ADD COLUMN deleted_by varchar;

ALTER TABLE project
    RENAME COLUMN parent_id to group_id;
ALTER TABLE project
    RENAME COLUMN delete_date to deleted_at;

ALTER TABLE branch_draft_reference
    RENAME COLUMN reference_project_id to reference_package_id;

ALTER TABLE favorite_projects RENAME to favorites;

ALTER TABLE favorites
    RENAME COLUMN project_id to id;

ALTER TABLE published_version
    RENAME COLUMN project_id to package_id;
ALTER TABLE published_version
    RENAME COLUMN publish_date to published_at;
ALTER TABLE published_version
    RENAME COLUMN delete_date to deleted_at;

ALTER TABLE published_version_revision_content
    RENAME COLUMN project_id to package_id;

ALTER TABLE published_data
    RENAME COLUMN project_id to package_id;

ALTER TABLE published_version_reference
    RENAME COLUMN project_id to package_id;
    
ALTER TABLE shared_url_info
    RENAME COLUMN project_id to package_id;

ALTER TABLE published_sources
    RENAME COLUMN project_id to package_id;
    
ALTER TABLE published_sources_data
    RENAME COLUMN project_id to package_id;
    
ALTER TABLE apihub_api_keys
    RENAME COLUMN project_id to package_id;