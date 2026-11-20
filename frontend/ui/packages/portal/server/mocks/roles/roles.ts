import type { Writeable } from '../../types'
import type { RolesDto } from '../auth/types'

export const ROLES_LIST: Writeable<RolesDto> = {
  roles: [
    {
      roleId: 'admin',
      role: 'Admin',
      readOnly: true,
      permissions: [
        'read',
        'create_and_update_package',
        'delete_package',
        'manage_draft_version',
        'manage_release_version',
        'manage_deprecated_version',
        'user_access_management',
        'access_token_management',
      ],
    },
    {
      roleId: 'release-manager',
      role: 'Release Manager',
      permissions: [
        'read',
        'manage_release_version',
      ],
    },
    {
      roleId: 'owner',
      role: 'Owner',
      permissions: [
        'read',
        'create_and_update_package',
        'delete_package',
        'manage_draft_version',
        'manage_release_version',
        'manage_deprecated_version',
      ],
    },
    {
      roleId: 'editor',
      role: 'Editor',
      permissions: [
        'read',
        'manage_draft_version',
        'manage_release_version',
        'manage_deprecated_version',
      ],
    },
    {
      roleId: 'viewer',
      role: 'Viewer',
      readOnly: true,
      permissions: [
        'read',
      ],
    },
    {
      roleId: 'none',
      role: 'None',
      readOnly: true,
      permissions: [],
    },
  ],
}
