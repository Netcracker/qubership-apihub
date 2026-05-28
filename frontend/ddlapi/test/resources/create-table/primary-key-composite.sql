CREATE TABLE tenant_users (
  tenant_id bigint NOT NULL,
  user_id bigint NOT NULL,
  role text,
  PRIMARY KEY (tenant_id, user_id)
);
