-- Best-effort rollback: restore exclude_from_search for personal private workspaces
-- (user_data.private_package_id).
-- Non-personal workspaces flipped by the up migration are not restored.

-- The migration runner may execute this script twice in one transaction (once to
-- roll back the stored version, once to validate the local one), so temp tables
-- created here can still exist from the earlier run.
DROP TABLE IF EXISTS tmp_personal_private_ws;

CREATE TEMP TABLE tmp_personal_private_ws ON COMMIT DROP AS
SELECT DISTINCT private_package_id AS workspace_id
FROM user_data
WHERE private_package_id IS NOT NULL
  AND private_package_id <> '';

UPDATE package_group pg
SET exclude_from_search = true
FROM tmp_personal_private_ws tw
WHERE pg.id = tw.workspace_id
   OR pg.id LIKE tw.workspace_id || '.%';
