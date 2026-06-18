import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { Box } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import type { SystemStyleObject } from '@mui/system/styleFunctionSx/styleFunctionSx'
import { type FC, memo, useCallback, useEffect, useMemo } from 'react'
import { generatePath, Outlet } from 'react-router-dom'

import { AppHeader } from '@netcracker/qubership-apihub-ui-shared/components/AppHeader'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
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
import { SESSION_STORAGE_KEY_LAST_IDENTITY_PROVIDER_ID } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { cutViewPortStyleCalculator } from '@netcracker/qubership-apihub-ui-shared/utils/themes'
import { matchPathname } from '@netcracker/qubership-apihub-ui-shared/utils/urls'

import { useEventBus } from '@apihub/routes/EventBusProvider'
import { PackageVersionBuilder } from '@apihub/routes/root/PortalPage/package-version-builder'
import { AiAssistantButton } from '@netcracker/qubership-apihub-ui-portal/src/components/AiAssistant/AiAssistantButton'
import { AiAssistantPanel } from '@netcracker/qubership-apihub-ui-portal/src/components/AiAssistant/AiAssistantPanel'
import { AiAssistantProvider } from '@netcracker/qubership-apihub-ui-portal/src/components/AiAssistant/state/AiAssistantProvider'
import * as packageJson from '../../../../package.json'
import { PORTAL_PATH_PATTERNS } from '../../../routes'
import { Notification, useShowErrorNotification } from '../BasePage/Notification'
import { MainPageProvider } from '../MainPage/MainPageProvider'
import { GlobalSearchPanel } from './GlobalSearchPanel/GlobalSearchPanel'
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

  useEffect(() => {
    PackageVersionBuilder.init(localStorage.getItem(SESSION_STORAGE_KEY_LAST_IDENTITY_PROVIDER_ID)).then()
  }, [])

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
        logo={<LogoIcon />}
        title="APIHUB"
        links={links}
        action={
          <>
            <VsCodeExtensionButton />
            <AppHeaderDivider />
            <SearchButton />
            {aiChatEnabled && <AiAssistantButton />}
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
      {aiChatEnabled && <AiAssistantPanel />}
      {systemNotification && <MaintenanceNotification value={systemNotification} />}
    </Box>
  )

  return (
    <MainPageProvider>
      <ModuleFetchingErrorBoundary showReloadPopup={packageJson.version !== frontendVersion}>
        {aiChatEnabled
          ? <AiAssistantProvider>{pageContent}</AiAssistantProvider>
          : pageContent}
      </ModuleFetchingErrorBoundary>
    </MainPageProvider>
  )
})

const SearchButton: FC = memo(() => {
  const { hideAiAssistantPanel, showGlobalSearchPanel } = useEventBus()

  const handleClick = useCallback((): void => {
    hideAiAssistantPanel()
    showGlobalSearchPanel()
  }, [hideAiAssistantPanel, showGlobalSearchPanel])

  return (
    <ButtonWithHint
      hint="Global Search"
      startIcon={<SearchOutlinedIcon />}
      aria-label="Global Search"
      size="large"
      color="inherit"
      data-testid="GlobalSearchButton"
      onClick={handleClick}
    />
  )
})

SearchButton.displayName = 'SearchButton'

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
