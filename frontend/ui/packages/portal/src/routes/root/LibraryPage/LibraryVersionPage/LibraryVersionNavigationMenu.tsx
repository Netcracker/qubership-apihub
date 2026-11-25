import { type FC, memo, useCallback, useMemo } from 'react'
import { type To, useNavigate, useParams } from 'react-router-dom'

import { NavigationMenu, type SidebarMenu } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import { ApiIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ApiIcon'
import { ComparisonIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ComparisonIcon'
import { ServicesIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ServicesIcon'

import { usePortalPageSettingsContext } from '@portal/routes/PortalPageSettingsProvider'
import { API_CHANGES_NO_PREVIOUS_VERSION_TOOLTIP } from '@portal/routes/root/PortalPage/VersionPage/VersionTabApiTypes/buildVersionTabsApiTypesState'
import { API_CHANGES_PAGE, CONTRACTS_PAGE, OVERVIEW_PAGE } from '../../../../routes'
import { getLibraryVersionPath } from './libraryVersion'

type LibraryVersionNavigationMenuProps = Readonly<{
  // as in the package menu: a version without a previous version has no API changes
  apiChangesDisabled: boolean
}>

export const LibraryVersionNavigationMenu: FC<LibraryVersionNavigationMenuProps> = memo(({ apiChangesDisabled }) => {
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
  const sidebarMenuItems = useMemo((): SidebarMenu[] => [
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
      tooltip: apiChangesDisabled ? API_CHANGES_NO_PREVIOUS_VERSION_TOOLTIP : 'API Changes',
      disabled: apiChangesDisabled,
      icon: <ComparisonIcon />,
      'data-testid': 'ApiChangesButton',
    },
  ], [apiChangesDisabled])

  return (
    <NavigationMenu
      open={expandMainMenu}
      setOpen={toggleExpandMainMenu}
      activeItem={currentMenuItem}
      sidebarMenuItems={sidebarMenuItems}
      onSelectItem={navigateAndSelect}
    />
  )
})
LibraryVersionNavigationMenu.displayName = 'LibraryVersionNavigationMenu'
