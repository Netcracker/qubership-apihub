import type { PackageSettingsNavItemProps } from './package-settings'
import { PACKAGE_KINDS_NAMES_MAP } from './package-settings'
import {
  ACCESS_TOKENS_PAGE,
  API_SPECIFIC_CONFIGURATION_PAGE,
  EXPORT_SETTINGS_PAGE,
  GENERAL_PAGE,
  USER_ACCESS_CONTROLS_PAGE,
  VERSIONS_PAGE,
} from '../../../../routes'
import { getPackageSettingsPath } from '../../../NavigationProvider'
import type { Package, PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND, GROUP_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import {
  ACCESS_TOKEN_MANAGEMENT_PERMISSION,
  type PackagePermissions,
  USER_ACCESS_MANAGEMENT_PERMISSION,
} from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'

const PACKAGE_KINDS_WITHOUT_VERSIONS = [GROUP_KIND, WORKSPACE_KIND]
const PACKAGE_KINDS_WITHOUT_API_SPECIFIC_CONFIGURATION = [GROUP_KIND, WORKSPACE_KIND, DASHBOARD_KIND]

export function useSidebarItems(packageObject: Package): PackageSettingsNavItemProps[] {
  const { key, kind } = packageObject
  const filters: ((item: PackageSettingsNavItemProps) => boolean)[] = []

  if (PACKAGE_KINDS_WITHOUT_VERSIONS.includes(kind)) {
    filters.push(({ value }) => value !== VERSIONS_PAGE)
  }
  if (PACKAGE_KINDS_WITHOUT_API_SPECIFIC_CONFIGURATION.includes(kind)) {
    filters.push(({ value }) => value !== API_SPECIFIC_CONFIGURATION_PAGE)
  }

  const hasPermissions = (userPerms: PackagePermissions, rule: PackagePermissions | undefined): boolean => {
    if (!rule?.length) {return true}
    const setUserPerms = new Set(userPerms)
    return rule.every(element => setUserPerms.has(element))
  }

  filters.push(({ permissions }) => hasPermissions(packageObject?.permissions ?? [], permissions))

  return SETTINGS_SIDEBAR_ITEM(key, kind).filter(item => filters.every(filter => filter(item)))
}

const SETTINGS_SIDEBAR_ITEM = (
  packageKey: Key,
  packageKind: PackageKind,
): PackageSettingsNavItemProps[] => [
  {
    label: 'General',
    description: `${PACKAGE_KINDS_NAMES_MAP[packageKind]} information`,
    value: GENERAL_PAGE,
    url: getPackageSettingsPath({ packageKey: packageKey, tab: GENERAL_PAGE }),
  },
  {
    label: 'API Specific Configuration',
    description: 'Configuration parameters',
    value: API_SPECIFIC_CONFIGURATION_PAGE,
    url: getPackageSettingsPath({ packageKey: packageKey, tab: API_SPECIFIC_CONFIGURATION_PAGE }),
  },
  {
    label: 'Export Settings',
    description: 'Export configuration parameters',
    value: EXPORT_SETTINGS_PAGE,
    url: getPackageSettingsPath({ packageKey: packageKey, tab: EXPORT_SETTINGS_PAGE }),
  },
  {
    label: 'Versions',
    description: 'Edit version information',
    value: VERSIONS_PAGE,
    url: getPackageSettingsPath({ packageKey: packageKey, tab: VERSIONS_PAGE }),
  },
  {
    label: 'Access Tokens',
    description: `Add a ${packageKind} access token`,
    value: ACCESS_TOKENS_PAGE,
    permissions: [ACCESS_TOKEN_MANAGEMENT_PERMISSION, USER_ACCESS_MANAGEMENT_PERMISSION],
    url: getPackageSettingsPath({ packageKey: packageKey, tab: ACCESS_TOKENS_PAGE }),
  },
  {
    label: 'User Access Control',
    description: `Add users to ${packageKind}`,
    value: USER_ACCESS_CONTROLS_PAGE,
    permissions: [USER_ACCESS_MANAGEMENT_PERMISSION],
    url: getPackageSettingsPath({ packageKey: packageKey, tab: USER_ACCESS_CONTROLS_PAGE }),
  },
]
