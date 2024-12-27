alter table user_integration add column refresh_token varchar;
alter table user_integration add column expires_at timestamp without time zone;
alter table user_integration add column redirect_uri varchar;
alter table user_integration add column failed_refresh_attempts integer default 0;

update user_integration set is_revoked = true;