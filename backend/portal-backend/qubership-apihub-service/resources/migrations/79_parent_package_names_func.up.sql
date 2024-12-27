create or replace function parent_package_names(varchar)
returns varchar[] language plpgsql
as '
declare 
split varchar[] := string_to_array($1, ''.'')::varchar[];
parent_ids varchar[];
parent_names varchar[];
begin

if coalesce(array_length(split, 1), 0) <= 1 then
	return ARRAY[]::varchar[];
end if;

parent_ids = parent_ids || split[1];

for i in 2..(array_length(split, 1) - 1)
loop
	parent_ids = parent_ids || (parent_ids[i-1] ||''.''|| split[i]);
end loop;
 
execute ''
select array_agg(name) from (
  select name from package_group 
  join unnest($1) with ordinality t(id, ord) using (id) --sort by parent_ids array
  order by t.ord) n'' 
into parent_names 
using parent_ids;

return parent_names;

end;';