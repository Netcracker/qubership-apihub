-- package_ancestor_ids returns the id of a package together with the ids of all of its ancestors, ordered
-- from the top level workspace down
CREATE OR REPLACE FUNCTION package_ancestor_ids(package_id character varying)
    RETURNS character varying[]
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    select array_agg(array_to_string(parts[1:depth], '.')::character varying order by depth)
    from (select string_to_array(package_id, '.') as parts) segments,
         generate_subscripts(segments.parts, 1) as depth;
$$;

-- Partial on deleted_at because every caller facing query carries that predicate and the deleted set only
-- grows. The deleted list gives up the index and sorts; it is system administrator only and small.
CREATE INDEX IF NOT EXISTS package_group_name_idx ON package_group (name, id) WHERE deleted_at IS NULL;

-- id breaks ties on equal dates. A page boundary that falls inside a group of events sharing a timestamp
-- can otherwise repeat or skip events, so the tiebreak is a correctness requirement of the paging rather
-- than a refinement of the sort.
CREATE INDEX IF NOT EXISTS activity_tracking_date_idx ON activity_tracking (date DESC, id DESC);

-- varchar_pattern_ops is load bearing rather than cosmetic. An API key scoped to one package reads its
-- subtree through a ~>=~ / ~<~ range, and those operators belong to the pattern operator family, which no
-- default opclass index can serve (same reason as migration 35). Without this index that caller has no
-- usable index at all and sequentially scans the largest table in the schema.
CREATE INDEX IF NOT EXISTS activity_tracking_package_id_date_idx ON activity_tracking (package_id varchar_pattern_ops, date DESC, id DESC);
CREATE INDEX IF NOT EXISTS package_group_id_pattern_idx ON package_group (id varchar_pattern_ops);

-- favorite_packages needs no equivalent: its primary key is already (user_id, package_id), so onlyFavorite
-- has the user side plan available where onlyShared does not. This index closes that asymmetry.
CREATE INDEX IF NOT EXISTS package_member_role_user_id_idx ON package_member_role (user_id, package_id);
