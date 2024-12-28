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
import { memo, useCallback } from 'react'
import { generatePath, Outlet } from 'react-router-dom'
import { Box, IconButton } from '@mui/material'
import { MainPageProvider } from '../MainPage/MainPageProvider'
import { GlobalSearchPanel } from './GlobalSearchPanel/GlobalSearchPanel'

import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { Notification, useShowErrorNotification } from '../BasePage/Notification'
import { UserPanel } from './UserPanel'
import type { SystemStyleObject } from '@mui/system/styleFunctionSx/styleFunctionSx'
import type { Theme } from '@mui/material/styles'
import { PortalSettingsButton } from './PortalSettingsButton'
import { PORTAL_PATH_PATTERNS } from '../../../routes'
import { useAuthorization } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import { useSuperAdminCheck } from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/useSuperAdminCheck'
import { cutViewPortStyleCalculator } from '@netcracker/qubership-apihub-ui-shared/utils/themes'
import {
  MaintenanceNotification,
  NOTIFICATION_HEIGHT,
} from '@netcracker/qubership-apihub-ui-shared/components/MaintenanceNotification'
import { LogoIcon } from '@netcracker/qubership-apihub-ui-shared/icons/LogoIcon'
import { AppHeader } from '@netcracker/qubership-apihub-ui-shared/components/AppHeader'
import { ExceptionSituationHandler } from '@netcracker/qubership-apihub-ui-shared/components/ExceptionSituationHandler'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { matchPathname } from '@netcracker/qubership-apihub-ui-shared/utils/urls'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { SystemInfoPopup, useSystemInfo } from '@netcracker/qubership-apihub-ui-shared/features/system-info'

export const BasePage: FC = memo(() => {
  const [authorization] = useAuthorization()
  const { notification: systemNotification } = useSystemInfo(!!authorization)
  const showErrorNotification = useShowErrorNotification()
  const isSuperAdmin = useSuperAdminCheck()

  const viewPortStyleCalculator = useCallback(
    (theme: Theme): SystemStyleObject<Theme> => {
      return cutViewPortStyleCalculator(theme, systemNotification ? NOTIFICATION_HEIGHT : 0)
    },
    [systemNotification],
  )

  return (
    <MainPageProvider>
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
            { name: 'API Editor', pathname: '/editor', testId: 'EditorHeaderButton' },
            { name: 'Agent', pathname: '/agents', testId: 'AgentHeaderButton' },
          ]}
          action={<>
            <SearchButton />
            {isSuperAdmin && <PortalSettingsButton />}
            <SystemInfoPopup/>
            <UserPanel />
          </>}
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
        {systemNotification && (
          <MaintenanceNotification value={systemNotification} />
        )}
      </Box>
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
