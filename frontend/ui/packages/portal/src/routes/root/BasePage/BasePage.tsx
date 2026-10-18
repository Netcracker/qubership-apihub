import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { Box } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import type { SystemStyleObject } from '@mui/system/styleFunctionSx/styleFunctionSx'
import { type FC, memo, useCallback, useMemo } from 'react'
import { generatePath, Outlet } from 'react-router-dom'

import { AppHeader } from '@netcracker/qubership-apihub-ui-shared/components/AppHeader'
import {
  VsCodeExtensionButton,
} from '@netcracker/qubership-apihub-ui-shared/components/Buttons/VsCodeExtensionButton/VsCodeExtensionButton'
import {
  AppHeaderDivider,
} from '@netcracker/qubership-apihub-ui-shared/components/Dividers/AppHeaderDivider/AppHeaderDivider'
import { ExceptionSituationHandler } from '@netcracker/qubership-apihub-ui-shared/components/ExceptionSituationHandler'
import {
  MaintenanceNotification,
  NOTIFICATION_HEIGHT,
} from '@netcracker/qubership-apihub-ui-shared/components/MaintenanceNotification'
import {
  ModuleFetchingErrorBoundary,
} from '@netcracker/qubership-apihub-ui-shared/components/ModuleFetchingErrorBoundary/ModuleFetchingErrorBoundary'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useAgentEnabled } from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'
import { SystemInfoPopup, useSystemInfo } from '@netcracker/qubership-apihub-ui-shared/features/system-info'
import { useVersionInfo } from '@netcracker/qubership-apihub-ui-shared/hooks/frontend-version/useVersionInfo'
import { useSuperAdminCheck } from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/useSuperAdminCheck'
import { LogoIcon } from '@netcracker/qubership-apihub-ui-shared/icons/LogoIcon'
import { RobotIcon } from '@netcracker/qubership-apihub-ui-shared/icons/RobotIcon'
import { cutViewPortStyleCalculator } from '@netcracker/qubership-apihub-ui-shared/utils/themes'
import { matchPathname } from '@netcracker/qubership-apihub-ui-shared/utils/urls'
import { AiAssistantPanel } from '@netcracker/qubership-apihub-ui-portal/src/components/AiAssistant/AiAssistantPanel'
import {
  AiAssistantProvider,
} from '@netcracker/qubership-apihub-ui-portal/src/components/AiAssistant/state/AiAssistantProvider'
import * as packageJson from '../../../../package.json'
import { PORTAL_PATH_PATTERNS } from '../../../routes'
import { Notification, useShowErrorNotification } from '../BasePage/Notification'
import { MainPageProvider } from '../MainPage/MainPageProvider'
import { GlobalSearchPanel } from './GlobalSearchPanel/GlobalSearchPanel'
import { AI_ASSISTANT_PANEL, GLOBAL_SEARCH_PANEL, SidePanelManagerProvider } from './PanelManager/SidePanelManager'
import { SidePanelTriggerButton } from './PanelManager/SidePanelTriggerButton'
import { PortalSettingsButton } from './PortalSettingsButton'
import { UserPanel } from './UserPanel'

export const BasePage: FC = memo(() => {
  const { notification: systemNotification, aiChatEnabled } = useSystemInfo()
  const showErrorNotification = useShowErrorNotification()
  const isSuperAdmin = useSuperAdminCheck()
  const { frontendVersion, apiProcessorVersion } = useVersionInfo()
  const agentEnabled = useAgentEnabled()
  const viewPortStyleCalculator = useCallback(
    (theme: Theme): SystemStyleObject<Theme> => {
      return cutViewPortStyleCalculator(theme, systemNotification ? NOTIFICATION_HEIGHT : 0)
    },
    [systemNotification],
  )

  const links = useMemo(
    () => (agentEnabled
      ? [
        { name: 'Portal', pathname: '/portal', active: true, 'data-testid': 'PortalHeaderButton' },
        { name: 'Agent', pathname: '/agents', 'data-testid': 'AgentHeaderButton' },
      ]
      : [
        { name: 'Portal', pathname: '/portal', active: true, 'data-testid': 'PortalHeaderButton' },
      ]),
    [agentEnabled],
  )

  const pageContent = (
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
            <VsCodeExtensionButton/>
            <AppHeaderDivider/>
            <SidePanelTriggerButton {...globalSearchButtonProps} />
            {aiChatEnabled && <SidePanelTriggerButton {...aiAssistantButtonProps} />}
            {isSuperAdmin && <PortalSettingsButton/>}
            <SystemInfoPopup
              frontendVersionKey={frontendVersion}
              apiProcessorVersion={apiProcessorVersion}
            />
            <UserPanel/>
          </>
        }
      />
      <Box sx={viewPortStyleCalculator}>
        <ExceptionSituationHandler
          homePath="/portal"
          showErrorNotification={showErrorNotification}
          redirectUrlFactory={replacePackageId}
        >
          <Outlet/>
        </ExceptionSituationHandler>
      </Box>
      <Notification/>
      <GlobalSearchPanel/>
      {aiChatEnabled && <AiAssistantPanel/>}
      {systemNotification && <MaintenanceNotification value={systemNotification}/>}
    </Box>
  )

  return (
    <MainPageProvider>
      <SidePanelManagerProvider>
        <ModuleFetchingErrorBoundary showReloadPopup={packageJson.version !== frontendVersion}>
          {aiChatEnabled
            ? <AiAssistantProvider>{pageContent}</AiAssistantProvider>
            : pageContent}
        </ModuleFetchingErrorBoundary>
      </SidePanelManagerProvider>
    </MainPageProvider>
  )
})

const globalSearchButtonProps = {
  panelId: GLOBAL_SEARCH_PANEL,
  hint: 'Global Search',
  icon: <SearchOutlinedIcon/>,
  testId: 'GlobalSearchButton',
}

const aiAssistantButtonProps = {
  panelId: AI_ASSISTANT_PANEL,
  hint: 'AI Assistant',
  icon: <RobotIcon/>,
  testId: 'AiAssistantButton',
}

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
