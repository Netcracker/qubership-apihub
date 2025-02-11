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
import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import { MainPageProvider } from '../MainPage/MainPageProvider'
import { UserPanel } from './UserPanel'
import type { Theme } from '@mui/material/styles'
import type { SystemStyleObject } from '@mui/system/styleFunctionSx/styleFunctionSx'
import { SystemInfoPopup, useSystemInfo } from '@netcracker/qubership-apihub-ui-shared/features/system-info'
import { Notification, useShowErrorNotification } from './Notification'
import { cutViewPortStyleCalculator } from '@netcracker/qubership-apihub-ui-shared/utils/themes'
import {
  MaintenanceNotification,
  NOTIFICATION_HEIGHT,
} from '@netcracker/qubership-apihub-ui-shared/components/MaintenanceNotification'
import { AppHeader } from '@netcracker/qubership-apihub-ui-shared/components/AppHeader'
import { LogoIcon } from '@netcracker/qubership-apihub-ui-shared/icons/LogoIcon'
import { ExceptionSituationHandler } from '@netcracker/qubership-apihub-ui-shared/components/ExceptionSituationHandler'
import * as packageJson from '../../../../package.json'

export const BasePage: FC = memo(() => {
  const { notification: systemNotification } = useSystemInfo()
  const showErrorNotification = useShowErrorNotification()

  const EDITOR_DEPRECATED = 40
  const viewPortStyleCalculator = useCallback(
    (theme: Theme): SystemStyleObject<Theme> => {
      return cutViewPortStyleCalculator(theme, systemNotification ? NOTIFICATION_HEIGHT + EDITOR_DEPRECATED : EDITOR_DEPRECATED)
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
            { name: 'Portal', pathname: '/portal', testId: 'PortalHeaderButton' },
            { name: 'API Editor', pathname: '/editor', active: true, testId: 'EditorHeaderButton' },
            { name: 'Agent', pathname: '/agents', testId: 'AgentHeaderButton' },
          ]}
          action={<>
            <SystemInfoPopup frontendVersionKey={packageJson.version} />
            <UserPanel />
          </>}
        />
        <Box sx={viewPortStyleCalculator}>
          <ExceptionSituationHandler
            homePath="/editor"
            showErrorNotification={showErrorNotification}
          >
            <Outlet />
          </ExceptionSituationHandler>
        </Box>
        <Notification />
        {systemNotification && (
          <MaintenanceNotification value={systemNotification} />
        )}
        <MaintenanceNotification
          value={'API Editor will be deprecated in upcoming releases. A VS Code plugin will replace it, enabling you to publish your API documents directly to Portal.'} />
      </Box>
    </MainPageProvider>
  )
})
