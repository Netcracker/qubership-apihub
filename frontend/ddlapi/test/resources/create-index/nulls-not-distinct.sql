CREATE TABLE memberships (id bigint PRIMARY KEY, user_id bigint, org_id bigint);

CREATE UNIQUE INDEX idx_memberships_unique ON memberships (user_id, org_id) NULLS NOT DISTINCT;
