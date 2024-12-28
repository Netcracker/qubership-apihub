/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { PackageSettingsNavItemProps } from './package-settings'
import { PACKAGE_KINDS_NAMES_MAP } from './package-settings'
import {
  ACCESS_TOKENS_PAGE,
  API_SPECIFIC_CONFIGURATION_PAGE,
  GENERAL_PAGE,
  USER_ACCESS_CONTROLS_PAGE,
  VERSIONS_PAGE,
} from '../../../../routes'
import { getPackageSettingsPath } from '../../../NavigationProvider'
import type { Package, PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND, GROUP_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

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
    label: 'Versions',
    description: 'Edit version information',
    value: VERSIONS_PAGE,
    url: getPackageSettingsPath({ packageKey: packageKey, tab: VERSIONS_PAGE }),
  },
  {
    label: 'Access Tokens',
    description: `Add a ${packageKind} access token`,
    value: ACCESS_TOKENS_PAGE,
    url: getPackageSettingsPath({ packageKey: packageKey, tab: ACCESS_TOKENS_PAGE }),
  },
  {
    label: 'User Access Control',
    description: `Add users to ${packageKind}`,
    value: USER_ACCESS_CONTROLS_PAGE,
    url: getPackageSettingsPath({ packageKey: packageKey, tab: USER_ACCESS_CONTROLS_PAGE }),
  },
]
