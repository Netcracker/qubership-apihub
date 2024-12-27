update published_version v
set metadata = metadata || jsonb_build_object('repository_url', p.repository_url)
from project p
where p.id = v.project_id;