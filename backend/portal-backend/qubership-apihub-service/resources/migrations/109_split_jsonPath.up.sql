create or replace function split_json_path(jsonb[]) returns jsonb[]
as
$$
declare
    items alias for $1;
    ret jsonb[];
begin
    for i in array_lower(items, 1)..array_upper(items, 1)
        loop
            ret[i] := jsonb_set(items[i], '{jsonPath}',
                                (array_to_json(string_to_array(trim(both '"' from (items[i] -> 'jsonPath')::text),
                                                               '/')))::jsonb, false);
        end loop;
    return ret;
end;
$$
    language plpgsql
    returns null on null input;

create or replace function merge_json_path(jsonb[]) returns jsonb[]
as
$$
declare
    items alias for $1;
    jsonpath text;
    ret jsonb[];
begin
    for i in array_lower(items, 1)..array_upper(items, 1) loop
            select string_agg(el, '/') into jsonpath from jsonb_array_elements_text(items[i]->'jsonPath') el;
            ret[i] := jsonb_set(items[i], '{jsonPath}', to_jsonb(jsonpath), false);
        end loop;
    return ret;
end;
$$
    language plpgsql
    RETURNS NULL ON NULL INPUT;

update operation
set deprecated_items = split_json_path(deprecated_items)
where deprecated_items != '{}';