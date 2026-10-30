-- Partial rollback for issue #762.
--
-- Restore versions this up-migration soft-deleted. The metadata.archived flag marks those
-- rows; already-deleted archived versions never received the flag and stay deleted.
-- Rewrite FTS first, while the flag is still present on published_version.
UPDATE public.fts_operation_search_text AS fts
SET status = 'archived'
FROM public.published_version AS pv
WHERE fts.package_id = pv.package_id
  AND fts.version = pv.version
  AND fts.revision = pv.revision
  AND pv.metadata @> '{"archived": true}'::jsonb;

UPDATE public.published_version
SET
    status = 'archived',
    deleted_at = NULL,
    metadata = metadata - 'archived'
WHERE metadata @> '{"archived": true}'::jsonb;

-- The up-migration erases which roles used to carry 'manage_archived_version', so a faithful
-- rollback is not possible: custom roles that had the permission cannot be identified after
-- the fact. This down-migration therefore restores the permission only for the three roles
-- that ship with it in 1_init.up.sql (admin, owner, editor).
--
-- Custom roles that previously had 'manage_archived_version' must be fixed manually.
--
-- Note: the permission is appended, so the resulting array order may differ from the original
-- seed. Permission arrays are treated as sets by the application, so order is not significant.
UPDATE public.role
SET permissions = array_append(permissions, 'manage_archived_version')
WHERE id IN ('admin', 'owner', 'editor')
  AND NOT ('manage_archived_version' = ANY(permissions));
