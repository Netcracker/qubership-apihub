update published_data 
set media_type = 'application/zip' 
where checksum in (select checksum from published_version_revision_content where file_id ilike '%.docx');
update published_data 
set media_type = 'image/jpeg' 
where checksum in (select checksum from published_version_revision_content where file_id ilike '%.jpg');
update published_data 
set media_type = 'image/png' 
where checksum in (select checksum from published_version_revision_content where file_id ilike '%.png');
update published_data 
set media_type = 'text/plain' 
where checksum in (select checksum from published_version_revision_content where file_id ilike '%.json');