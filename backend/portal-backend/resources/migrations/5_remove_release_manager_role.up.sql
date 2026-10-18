UPDATE role
SET rank = CASE
        WHEN id = 'admin' THEN greatest(1000, rank - 1)
        ELSE rank - 1
END
WHERE rank > (SELECT rank FROM role WHERE id = 'release-manager');

DELETE FROM role
WHERE id = 'release-manager';

UPDATE package_member_role
SET roles = array_remove(roles, 'release-manager');

DELETE FROM package_member_role
WHERE roles = ARRAY[]::varchar[];