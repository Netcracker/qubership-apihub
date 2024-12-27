UPDATE published_version_revision_content AS pvrc
SET metadata = JSONB_SET(metadata, '{commitId}',(select metadata -> 'commitId' from published_data as pd WHERE pd.package_id = pvrc.package_id AND pd.checksum = pvrc.checksum LIMIT 1));

UPDATE published_version_revision_content AS pvrc
SET metadata = JSONB_SET(metadata, '{commitDate}',(select metadata -> 'commitDate' from published_data as pd WHERE pd.package_id = pvrc.package_id AND pd.checksum = pvrc.checksum LIMIT 1));

ALTER TABLE published_data
    DROP COLUMN metadata;
