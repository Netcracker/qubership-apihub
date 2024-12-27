update branch_draft_content set included = null where included = false;
update branch_draft_content set publish = null where publish = false;
update user_integration set is_revoked = null where is_revoked = false;
update build set restart_count = null where restart_count = 0;
