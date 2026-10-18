DROP INDEX IF EXISTS package_member_role_user_id_idx;
DROP INDEX IF EXISTS activity_tracking_package_id_date_idx;
DROP INDEX IF EXISTS activity_tracking_date_idx;
DROP INDEX IF EXISTS package_group_name_idx;
DROP INDEX IF EXISTS package_group_id_pattern_idx;
DROP FUNCTION IF EXISTS package_ancestor_ids(character varying);
