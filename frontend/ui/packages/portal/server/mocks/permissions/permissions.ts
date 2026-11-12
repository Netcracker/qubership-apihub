import type { Writeable } from '../../types'
import type { PermissionsDto } from '../auth/types'

export const PERMISSIONS_LIST: Writeable<PermissionsDto> = {
  permissions: [
    {
      permission: 'read',
      name: 'read content of public packages',
    },
    {
      permission: 'create_and_update_package',
      name: 'create, update group/package',
    },
    {
      permission: 'delete_package',
      name: 'delete group/package',
    },
    {
      permission: 'manage_draft_version',
      name: 'manage version in draft status',
    },
    {
      permission: 'manage_release_version',
      name: 'manage version in release status',
    },
    {
      permission: 'manage_deprecated_version',
      name: 'manage version in deprecated status',
    },
    {
      permission: 'user_access_management',
      name: 'user access management',
    },
    {
      permission: 'access_token_management',
      name: 'access token management',
    },
  ],
}
