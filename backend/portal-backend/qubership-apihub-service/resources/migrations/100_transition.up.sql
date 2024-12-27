create table activity_tracking_transition
(
    id               varchar
        constraint activity_tracking_transition_pk
            primary key,
    tr_type          varchar                     not null,
    from_id          varchar                     not null,
    to_id            varchar                     not null,
    status           varchar                     not null,
    details          varchar,
    started_by       varchar                     not null,
    started_at       timestamp without time zone not null,
    finished_at      timestamp without time zone,
    progress_percent int,
    affected_objects int
);

create unique index activity_tracking_transition_id_uindex
    on activity_tracking_transition (id);


create or replace function parent_package_names(character varying) returns character varying[]
    language plpgsql
as
$$
declare
    split varchar[] := string_to_array($1, '.')::varchar[];
    parent_ids varchar[];
    parent_names varchar[];
begin

    if coalesce(array_length(split, 1), 0) <= 1 then
        return ARRAY[]::varchar[];
    end if;

    parent_ids = parent_ids || split[1];

    for i in 2..(array_length(split, 1) - 1)
        loop
            parent_ids = parent_ids || (parent_ids[i-1] ||'.'|| split[i])::character varying;
        end loop;

    execute '
select array_agg(name) from (
  select name from package_group
  join unnest($1) with ordinality t(id, ord) using (id) --sort by parent_ids array
  order by t.ord) n'
        into parent_names
        using parent_ids;

    return parent_names;

end;
$$;
