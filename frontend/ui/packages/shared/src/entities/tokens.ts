export const SYSTEM_ADMINISTRATOR_TOKEN_USER_ROLE = 'System administrator'
export const ADMIN_TOKEN_USER_ROLE = 'Admin'
export const OWNER_TOKEN_USER_ROLE = 'Owner'
export const RELEASE_MANAGER_TOKEN_USER_ROLE = 'Release Manager'
export const EDITOR_TOKEN_USER_ROLE = 'Editor'
export const VIEWER_TOKEN_USER_ROLE = 'Viewer'
export const NONE_TOKEN_USER_ROLE = 'None'


export const tokenRoleMapping: Record<string, string> = {
  admin: ADMIN_TOKEN_USER_ROLE,
  owner: OWNER_TOKEN_USER_ROLE,
  'release-manager': RELEASE_MANAGER_TOKEN_USER_ROLE,
  'System administrator': SYSTEM_ADMINISTRATOR_TOKEN_USER_ROLE,
  editor: EDITOR_TOKEN_USER_ROLE,
  viewer: VIEWER_TOKEN_USER_ROLE,
  none: NONE_TOKEN_USER_ROLE,
}

export const reverseTokenRoleMapping: Record<string, string> = {
  [ADMIN_TOKEN_USER_ROLE] : 'admin',
  [OWNER_TOKEN_USER_ROLE] : 'owner',
  [RELEASE_MANAGER_TOKEN_USER_ROLE] : 'release-manager',
  [EDITOR_TOKEN_USER_ROLE] : 'editor',
  [VIEWER_TOKEN_USER_ROLE] : 'viewer',
  [NONE_TOKEN_USER_ROLE] : 'none',
}

export const SYSTEM_TOKENS_PACKAGE_KEY = '*'
