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

import { Box, IconButton } from '@mui/material'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { generatePath, Outlet } from 'react-router-dom'
import { MainPageProvider } from '../MainPage/MainPageProvider'
import { GlobalSearchPanel } from './GlobalSearchPanel/GlobalSearchPanel'

import { useEventBus } from '@apihub/routes/EventBusProvider'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import type { Theme } from '@mui/material/styles'
import type { SystemStyleObject } from '@mui/system/styleFunctionSx/styleFunctionSx'
import { AppHeader } from '@netcracker/qubership-apihub-ui-shared/components/AppHeader'
import { ExceptionSituationHandler } from '@netcracker/qubership-apihub-ui-shared/components/ExceptionSituationHandler'
import {
  MaintenanceNotification,
  NOTIFICATION_HEIGHT,
} from '@netcracker/qubership-apihub-ui-shared/components/MaintenanceNotification'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { SystemInfoPopup, useSystemInfo } from '@netcracker/qubership-apihub-ui-shared/features/system-info'
import { useSuperAdminCheck } from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/useSuperAdminCheck'
import { LogoIcon } from '@netcracker/qubership-apihub-ui-shared/icons/LogoIcon'
import { cutViewPortStyleCalculator } from '@netcracker/qubership-apihub-ui-shared/utils/themes'
import { matchPathname } from '@netcracker/qubership-apihub-ui-shared/utils/urls'
import * as packageJson from '../../../../package.json'
import { PORTAL_PATH_PATTERNS } from '../../../routes'
import { Notification, useShowErrorNotification } from '../BasePage/Notification'
import { PortalSettingsButton } from './PortalSettingsButton'
import { UserPanel } from './UserPanel'
import { useVersionInfo } from '@netcracker/qubership-apihub-ui-shared/hooks/frontend-version/useVersionInfo'
import {
  ModuleFetchingErrorBoundary,
} from '@netcracker/qubership-apihub-ui-shared/components/ModuleFetchingErrorBoundary/ModuleFetchingErrorBoundary'
import {
  VsCodeExtensionButton,
} from '@netcracker/qubership-apihub-ui-shared/components/Buttons/VsCodeExtensionButton/VsCodeExtensionButton'
import {
  AppHeaderDivider,
} from '@netcracker/qubership-apihub-ui-shared/components/Dividers/AppHeaderDivider/AppHeaderDivider'

export const BasePage: FC = memo(() => {
  const { notification: systemNotification } = useSystemInfo()
  const showErrorNotification = useShowErrorNotification()
  const isSuperAdmin = useSuperAdminCheck()
  const { frontendVersion, apiProcessorVersion } = useVersionInfo()

  const viewPortStyleCalculator = useCallback(
    (theme: Theme): SystemStyleObject<Theme> => {
      return cutViewPortStyleCalculator(theme, systemNotification ? NOTIFICATION_HEIGHT : 0)
    },
    [systemNotification],
  )

  return (
    <MainPageProvider>
      <ModuleFetchingErrorBoundary showReloadPopup={packageJson.version !== frontendVersion}>
        <Box
          display="grid"
          gridTemplateRows="max-content 1fr"
          height="100vh"
        >
          <AppHeader
            logo={<LogoIcon />}
            title="APIHUB"
            links={[
              { name: 'Portal', pathname: '/portal', active: true, testId: 'PortalHeaderButton' },
              { name: 'Agent', pathname: '/agents', testId: 'AgentHeaderButton' },
            ]}
            action={
              <>
                <VsCodeExtensionButton />
                <AppHeaderDivider />
                <SearchButton />
                {isSuperAdmin && <PortalSettingsButton />}
                <SystemInfoPopup
                  frontendVersionKey={frontendVersion}
                  apiProcessorVersion={apiProcessorVersion}
                />
                <UserPanel />
              </>
            }
          />
          <Box sx={viewPortStyleCalculator}>
            <ExceptionSituationHandler
              homePath="/portal"
              showErrorNotification={showErrorNotification}
              redirectUrlFactory={replacePackageId}
            >
              <Outlet />
            </ExceptionSituationHandler>
          </Box>
          <Notification />
          <GlobalSearchPanel />
          {systemNotification && <MaintenanceNotification value={systemNotification} />}
        </Box>
      </ModuleFetchingErrorBoundary>
    </MainPageProvider>
  )
})

const SearchButton: FC = memo(() => {
  const { showGlobalSearchPanel } = useEventBus()
  return (
    <IconButton
      data-testid="GlobalSearchButton"
      size="large"
      color="inherit"
      onClick={showGlobalSearchPanel}
    >
      <SearchOutlinedIcon />
    </IconButton>
  )
})

function replacePackageId(locationPathname: string, searchParams: URLSearchParams, packageId: Key): string {
  const locationMatch = matchPathname(locationPathname, PORTAL_PATH_PATTERNS)!
  const newPathname = generatePath(
    locationMatch.pattern.path,
    {
      ...locationMatch!.params,
      packageId,
    },
  )
  return `${newPathname}?${searchParams}`
}
