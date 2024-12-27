alter table user_integration drop column refresh_token;
alter table user_integration drop column expires_at;
alter table user_integration drop column redirect_uri;
alter table user_integration drop column failed_refresh_attempts;