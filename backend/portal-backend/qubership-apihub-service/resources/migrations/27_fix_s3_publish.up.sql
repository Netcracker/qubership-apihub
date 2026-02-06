-- FK constraint blocks publish if S3 is fully enabled and sources archives are uploaded to it
ALTER TABLE ONLY published_sources DROP CONSTRAINT published_sources_published_sources_archives_checksum_fk;
