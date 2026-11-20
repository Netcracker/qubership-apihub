import type { Permission } from '../types/permissions'

export const ADMIN_USER_ROLE_ID = 'admin'
export const EDITOR_USER_ROLE_ID = 'editor'
export const VIEWER_USER_ROLE_ID = 'viewer'

export type UserRole =
  | typeof ADMIN_USER_ROLE_ID
  | typeof EDITOR_USER_ROLE_ID
  | typeof VIEWER_USER_ROLE_ID

export type CreateRoleProps = {
  role: string
  permissions: Permission[]
}
