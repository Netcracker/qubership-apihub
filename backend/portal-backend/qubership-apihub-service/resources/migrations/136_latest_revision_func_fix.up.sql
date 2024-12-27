create or replace function get_latest_revision(package_id varchar, version varchar)
    returns integer language plpgsql
as '
    declare
        latest_revision integer;
    begin
        execute ''
        select max(revision)
        from published_version
        where package_id = $1 and version = $2;''
            into latest_revision
            using package_id,version;
        if latest_revision is null then return 0;
        end if;
        return latest_revision;
    end;';
