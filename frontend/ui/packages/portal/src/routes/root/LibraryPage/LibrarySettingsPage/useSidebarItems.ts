import { generatePath } from 'react-router-dom'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import {
  ACCESS_TOKEN_MANAGEMENT_PERMISSION,
  type PackagePermissions,
  USER_ACCESS_MANAGEMENT_PERMISSION,
} from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'

import type { MavenLibraryDto } from '@portal/entities/libraries'
import {
  ACCESS_TOKENS_PAGE,
  GENERAL_PAGE,
  LIBRARY_SETTINGS_PAGE_PATH_PATTERN,
  USER_ACCESS_CONTROLS_PAGE,
  VERSIONS_PAGE,
} from '../../../../routes'
import type { LibrarySettingsNavItemProps } from './library-settings'

export function useSidebarItems(library: MavenLibraryDto): LibrarySettingsNavItemProps[] {
  const hasPermissions = (userPerms: PackagePermissions, rule: PackagePermissions | undefined): boolean => {
    if (!rule?.length) return true
    const setUserPerms = new Set(userPerms)
    return rule.every(permission => setUserPerms.has(permission))
  }

  return SETTINGS_SIDEBAR_ITEM(library.libraryId).filter(({ permissions }) => {
    return hasPermissions(library.permissions ?? [], permissions)
  })
}

const SETTINGS_SIDEBAR_ITEM = (libraryId: Key): LibrarySettingsNavItemProps[] => {
  const settingsPath = generatePath(LIBRARY_SETTINGS_PAGE_PATH_PATTERN, { libraryId: encodeURIComponent(libraryId) })
  return [
    {
      label: 'General',
      description: 'Library information',
      value: GENERAL_PAGE,
      url: `${settingsPath}/${GENERAL_PAGE}`,
    },
    {
      label: 'Library Versions',
      description: 'Edit version information',
      value: VERSIONS_PAGE,
      url: `${settingsPath}/${VERSIONS_PAGE}`,
    },
    {
      label: 'Access Tokens',
      description: 'Add a library access token',
      value: ACCESS_TOKENS_PAGE,
      url: `${settingsPath}/${ACCESS_TOKENS_PAGE}`,
      permissions: [ACCESS_TOKEN_MANAGEMENT_PERMISSION, USER_ACCESS_MANAGEMENT_PERMISSION],
    },
    {
      label: 'User Access Control',
      description: 'Add users to library',
      value: USER_ACCESS_CONTROLS_PAGE,
      url: `${settingsPath}/${USER_ACCESS_CONTROLS_PAGE}`,
      permissions: [USER_ACCESS_MANAGEMENT_PERMISSION],
    },
  ]
}
