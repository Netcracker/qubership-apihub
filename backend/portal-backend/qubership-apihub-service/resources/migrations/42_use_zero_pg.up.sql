update branch_draft_content set included = false where included is null;
update branch_draft_content set publish = false where publish is null;
update user_integration set is_revoked = false where is_revoked is null;
update build set restart_count = 0 where restart_count is null;
