UPDATE fts_latest_release_operation_data fts
SET package_id = COALESCE(
    (SELECT new_package_id FROM package_transition WHERE old_package_id = fts.package_id),
    package_id
)
WHERE fts.package_id NOT IN (SELECT id FROM package_group);

UPDATE published_version_reference pvr
SET parent_reference_id = COALESCE(
    (SELECT new_package_id FROM package_transition WHERE old_package_id = pvr.parent_reference_id),
    parent_reference_id
)
WHERE pvr.parent_reference_id NOT IN (SELECT id FROM package_group);

UPDATE transformed_content_data tcd
SET package_id = COALESCE(
    (SELECT new_package_id FROM package_transition WHERE old_package_id = tcd.package_id),
    package_id
)
WHERE tcd.package_id NOT IN (SELECT id FROM package_group);
