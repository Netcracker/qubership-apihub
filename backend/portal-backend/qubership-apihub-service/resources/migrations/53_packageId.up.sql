ALTER TABLE project
    ADD COLUMN package_id varchar;

update project p
set package_id = id
where (select count(id) from package_group where id = p.id and kind = 'package') > 0