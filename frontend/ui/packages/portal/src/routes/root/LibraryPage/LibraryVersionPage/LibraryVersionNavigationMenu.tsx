import { type FC, memo, useCallback, useMemo } from 'react'
import { type To, useNavigate, useParams } from 'react-router-dom'

import { NavigationMenu, type SidebarMenu } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import { ApiIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ApiIcon'
import { ComparisonIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ComparisonIcon'
import { ServicesIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ServicesIcon'

import { usePortalPageSettingsContext } from '@portal/routes/PortalPageSettingsProvider'
import { API_CHANGES_PAGE, CONTRACTS_PAGE, OVERVIEW_PAGE } from '../../../../routes'
import { getLibraryVersionPath } from './libraryVersion'

export const LibraryVersionNavigationMenu: FC = memo(() => {
  const navigate = useNavigate()
  const { libraryId = '', versionId = '' } = useParams()
  const [currentMenuItem] = useActiveTabs()
  const { expandMainMenu, toggleExpandMainMenu } = usePortalPageSettingsContext()
  const pagePathsMap = useMemo<Record<string, To>>(() => ({
    [OVERVIEW_PAGE]: getLibraryVersionPath(libraryId, versionId),
    [CONTRACTS_PAGE]: getLibraryVersionPath(libraryId, versionId, CONTRACTS_PAGE),
    [API_CHANGES_PAGE]: getLibraryVersionPath(libraryId, versionId, API_CHANGES_PAGE),
  }), [libraryId, versionId])
  const navigateAndSelect = useCallback((menuItemId: string): void => {
    const pathToNavigate = pagePathsMap[menuItemId]
    pathToNavigate && navigate(pathToNavigate)
  }, [navigate, pagePathsMap])

  return (
    <NavigationMenu
      open={expandMainMenu}
      setOpen={toggleExpandMainMenu}
      activeItem={currentMenuItem}
      sidebarMenuItems={SIDEBAR_MENU_ITEMS}
      onSelectItem={navigateAndSelect}
    />
  )
})
LibraryVersionNavigationMenu.displayName = 'LibraryVersionNavigationMenu'

const SIDEBAR_MENU_ITEMS: SidebarMenu[] = [
  {
    id: OVERVIEW_PAGE,
    title: 'Overview',
    tooltip: 'Overview',
    icon: <ServicesIcon />,
    'data-testid': 'OverviewButton',
  },
  {
    id: CONTRACTS_PAGE,
    title: 'API Reference',
    tooltip: 'API Reference',
    icon: <ApiIcon />,
    'data-testid': 'ContractsButton',
  },
  {
    id: API_CHANGES_PAGE,
    title: 'API Changes',
    tooltip: 'API Changes',
    icon: <ComparisonIcon />,
    'data-testid': 'ApiChangesButton',
  },
]
