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
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { Box } from '@mui/material'
import type { FC, PropsWithChildren } from 'react'
import { memo, useMemo } from 'react'
import { useLocation } from 'react-router-dom'

import { AppHeader } from '@netcracker/qubership-apihub-ui-shared/components/AppHeader'
import {
  AppHeaderDivider,
} from '@netcracker/qubership-apihub-ui-shared/components/Dividers/AppHeaderDivider/AppHeaderDivider'
import { ExceptionSituationHandler } from '@netcracker/qubership-apihub-ui-shared/components/ExceptionSituationHandler'
import { useAgentEnabled } from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'
import { useSuperAdminCheck } from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/useSuperAdminCheck'
import { LogoIcon } from '@netcracker/qubership-apihub-ui-shared/icons/LogoIcon'

import { GUIDES_PAGE_PATH, HOME_PAGE_PATH } from '../../../routes'
import { BackwardLocationProvider } from '../../BackwardLocationProvider'
import { Notification, useShowErrorNotification } from '../BasePage/Notification'
import { GlobalSearchPanel } from '../BasePage/GlobalSearchPanel/GlobalSearchPanel'
import { GLOBAL_SEARCH_PANEL, SidePanelManagerProvider } from '../BasePage/PanelManager/SidePanelManager'
import { SidePanelTriggerButton } from '../BasePage/PanelManager/SidePanelTriggerButton'
import { PortalSettingsButton } from '../BasePage/PortalSettingsButton'
import { UserPanel } from '../BasePage/UserPanel'

/**
 * Layout of the developer portal home page.
 * Unlike BasePage it does not depend on a logged-in user: all data it fetches
 * is available to anonymous visitors when anonymous access is enabled on the backend.
 */
export const HomeLayout: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const showErrorNotification = useShowErrorNotification()
  const agentEnabled = useAgentEnabled()
  const isSuperAdmin = useSuperAdminCheck()
  const { pathname } = useLocation()
  const isGuidesPage = pathname.startsWith(GUIDES_PAGE_PATH)

  const links = useMemo(
    () => [
      { name: 'Home', pathname: HOME_PAGE_PATH, active: !isGuidesPage, 'data-testid': 'HomeHeaderButton' },
      { name: 'Guides', pathname: GUIDES_PAGE_PATH, active: isGuidesPage, 'data-testid': 'GuidesHeaderButton' },
      { name: 'API portal', pathname: '/portal', 'data-testid': 'PortalHeaderButton' },
      ...(agentEnabled ? [{ name: 'Agent', pathname: '/agents', 'data-testid': 'AgentHeaderButton' }] : []),
    ],
    [agentEnabled, isGuidesPage],
  )

  return (
    <BackwardLocationProvider>
    <SidePanelManagerProvider>
      <Box
        display="grid"
        gridTemplateRows="max-content 1fr"
        height="100vh"
      >
        <AppHeader
          logo={<LogoIcon/>}
          title="APIHUB"
          links={links}
          action={
            <>
              <SidePanelTriggerButton {...globalSearchButtonProps} />
              {isSuperAdmin && <PortalSettingsButton/>}
              <AppHeaderDivider/>
              <UserPanel/>
            </>
          }
        />
        <Box sx={{ overflow: 'auto', backgroundColor: 'background.default' }}>
          <ExceptionSituationHandler
            homePath="/"
            showErrorNotification={showErrorNotification}
          >
            {children}
          </ExceptionSituationHandler>
        </Box>
        <Notification/>
        <GlobalSearchPanel/>
      </Box>
    </SidePanelManagerProvider>
    </BackwardLocationProvider>
  )
})

const globalSearchButtonProps = {
  panelId: GLOBAL_SEARCH_PANEL,
  hint: 'Global Search',
  icon: <SearchOutlinedIcon/>,
  testId: 'GlobalSearchButton',
}
