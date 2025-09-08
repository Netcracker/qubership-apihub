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

import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { AccessTokensPackageSettingsTab } from './AccessTokensPackageSettingsTab'
import { GeneralPackageSettingsTab } from './GeneralPackageSettingsTab/GeneralPackageSettingsTab'
import { useActiveTabContentContext } from './PackageSettingsPage'
import type { PackageSettingsTabProps } from './package-settings'
import { VersionsPackageSettingsTab } from './VersionsPackageSettingsTab/VersionsPackageSettingsTab'
import {
  ACCESS_TOKENS_PAGE,
  API_SPECIFIC_CONFIGURATION_PAGE,
  EXPORT_SETTINGS_PAGE,
  GENERAL_PAGE,
  USER_ACCESS_CONTROLS_PAGE,
  VERSIONS_PAGE,
} from '../../../../routes'
import {
  SpecificConfigurationPackageSettingsTab,
} from './SpecificConfigurationPackageSettingsTab/SpecificConfigurationPackageSettingsTab'
import {
  UserPackageAccessControlSettingsTab,
} from '@apihub/routes/root/PortalPage/PackageSettingsPage/UserPackageAccessControlSettingsTab/UserPackageAccessControlSettingsTab'
import {
  ExportSettingsTab,
} from '@apihub/routes/root/PortalPage/PackageSettingsPage/ExportSettingsTab/ExportSettingsTab'
import {
  CONTENT_PLACEHOLDER_AREA,
  NO_PERMISSION,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import {
  ACCESS_TOKEN_MANAGEMENT_PERMISSION,
  USER_ACCESS_MANAGEMENT_PERMISSION,
} from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'

export const PackageSettingsBody: FC<PackageSettingsTabProps> = memo<PackageSettingsTabProps>(({
  packageObject,
  isPackageLoading,
}) => {
  const activeTab = useActiveTabContentContext()
  const hasTokenManagementPermission = useMemo(
    () => !!packageObject?.permissions?.includes(ACCESS_TOKEN_MANAGEMENT_PERMISSION),
    [packageObject],
  )
  const hasUserAccessManagementPermission = useMemo(
    () => !!packageObject.permissions?.includes(USER_ACCESS_MANAGEMENT_PERMISSION),
    [packageObject],
  )
  return (
    <>
      {
        {
          [GENERAL_PAGE]: (
            <GeneralPackageSettingsTab
              packageObject={packageObject}
              isPackageLoading={isPackageLoading}
            />
          ),
          [API_SPECIFIC_CONFIGURATION_PAGE]: <SpecificConfigurationPackageSettingsTab packageObject={packageObject}/>,
          [EXPORT_SETTINGS_PAGE]: <ExportSettingsTab packageObject={packageObject}/>,
          [VERSIONS_PAGE]: <VersionsPackageSettingsTab packageObject={packageObject}/>,
          [ACCESS_TOKENS_PAGE]:
            <Placeholder
              invisible={hasTokenManagementPermission}
              area={CONTENT_PLACEHOLDER_AREA}
              message={NO_PERMISSION}
              testId={'NoPermissionPlaceholder'}
            > <AccessTokensPackageSettingsTab packageObject={packageObject}/>
            </Placeholder>,
          [USER_ACCESS_CONTROLS_PAGE]: <Placeholder
            invisible={hasUserAccessManagementPermission}
            area={CONTENT_PLACEHOLDER_AREA}
            message={NO_PERMISSION}
            testId={'NoPermissionPlaceholder'}
          ><UserPackageAccessControlSettingsTab packageObject={packageObject}/>
          </Placeholder>,
        }[activeTab]
      }
    </>
  )
})
