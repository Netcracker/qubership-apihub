UPDATE role
SET rank = rank + 1
WHERE rank > (SELECT rank FROM role WHERE id = 'owner');

INSERT INTO role
VALUES ('release-manager', 'Release Manager',
        (SELECT rank FROM role WHERE id = 'owner') + 1,
        '{read,manage_release_version}', false);
