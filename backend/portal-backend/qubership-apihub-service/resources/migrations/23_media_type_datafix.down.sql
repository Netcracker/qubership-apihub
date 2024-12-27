update published_data 
set media_type = 'text/plain'
where media_type in ('application/zip', 'image/jpeg', 'image/png');
update published_data 
set media_type = 'application/json' 
where checksum in (select checksum from published_version_revision_content where file_id ilike '%.json');