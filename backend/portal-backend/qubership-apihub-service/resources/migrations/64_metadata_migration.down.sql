ALTER TABLE published_data
    ADD COLUMN metadata jsonb;

UPDATE published_data AS pd
SET metadata = JSONB_SET(metadata, '{commitId}',(select metadata -> 'commitId' from published_version_revision_content as pvrc WHERE pd.package_id = pvrc.package_id AND pd.checksum = pvrc.checksum LIMIT 1));

UPDATE published_data AS pd
SET metadata = JSONB_SET(metadata, '{commitDate}',(select metadata -> 'commitDate' from published_version_revision_content as pvrc WHERE pd.package_id = pvrc.package_id AND pd.checksum = pvrc.checksum LIMIT 1));
