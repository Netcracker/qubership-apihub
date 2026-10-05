import { type FC, memo, useCallback, useMemo } from 'react'
import { type To, useNavigate, useParams } from 'react-router-dom'

import type { SidebarMenu } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import { NavigationMenu } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ContractType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import {
  EXPAND_NAVIGATION_MENU,
} from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useExpandNavigationMenuSearchParam'
import { ApiIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ApiIcon'
import { CertifiedFileIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CertifiedFileIcon'
import { ComparisonIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ComparisonIcon'
import { FileIcon } from '@netcracker/qubership-apihub-ui-shared/icons/FileIcon'
import { ServicesIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ServicesIcon'
import { SettingIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SettingIcon'
import { DefaultWarningIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningIcon'
import type { OperationsViewMode } from '@netcracker/qubership-apihub-ui-shared/types/views'
import {
  EXPAND_NAVIGATION_MENU_SEARCH_PARAM,
  OPERATIONS_VIEW_MODE_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

import type { Key } from '@portal/entities/keys'
import { usePortalPageSettingsContext } from '@portal/routes/PortalPageSettingsProvider'
import { VERSION_TAB_IDS } from './VersionPage/VersionTabApiTypes/version-tab-allowed-api-types'
import type { VersionTabsApiTypesState } from './VersionPage/VersionTabApiTypes/buildVersionTabsApiTypesState'

import {
  API_CHANGES_PAGE,
  API_QUALITY_PAGE,
  CONTRACTS_PAGE,
  DEPRECATED_PAGE,
  DOCUMENTS_PAGE,
  OVERVIEW_PAGE,
  PACKAGE_SETTINGS_PAGE,
} from '../../../routes'
import {
  getApiChangesPath,
  getApiQualityPath,
  getDeprecatedPath,
  getDocumentPath,
  getOperationsPath,
  getOverviewPath,
  getPackageSettingsPath,
} from '../../NavigationProvider'
import { useApiQualityLinterEnabled } from './VersionPage/ApiQualityValidationSummaryProvider'
import { useOperationsView } from './VersionPage/useOperationsView'
import { useVersionTabApiTypes } from './VersionPage/useVersionTabApiTypes'

export type VersionNavigationMenuProps = {
  menuItems: string[]
  showSettings?: boolean
}

export const VersionNavigationMenu: FC<VersionNavigationMenuProps> = memo<VersionNavigationMenuProps>(({
  menuItems,
  showSettings = false,
}) => {
  const navigate = useNavigate()
  const { packageId, versionId } = useParams()
  const linterEnabled = useApiQualityLinterEnabled()
  const versionTabApiTypes = useVersionTabApiTypes()
  const { expandMainMenu, toggleExpandMainMenu, operationsViewMode } = usePortalPageSettingsContext()
  const [operationsView] = useOperationsView(operationsViewMode)
  const [currentMenuItem] = useActiveTabs()

  const sidebarMenuItems = useMemo(
    () =>
      getAvailableSidebarMenuItems(versionTabApiTypes.tabs, linterEnabled)
        .filter(({ id }) => menuItems.includes(id)),
    [linterEnabled, menuItems, versionTabApiTypes.tabs],
  )
  const sidebarServiceMenuItems = useMemo(
    () => getAvailableSidebarServiceMenuItems(showSettings).filter(({ id }) => menuItems.includes(id)),
    [menuItems, showSettings],
  )
  const pagePathsMap = useMemo(
    () =>
      getPagePathsMap({
        packageKey: packageId!,
        versionKey: versionId!,
        tabs: versionTabApiTypes.tabs,
        defaultOperationsView: operationsView,
        expandMenu: expandMainMenu,
      }),
    [expandMainMenu, operationsView, packageId, versionId, versionTabApiTypes.tabs],
  )

  const navigateAndSelect = useCallback((menuItemId: string): void => {
    const pathToNavigate = pagePathsMap[menuItemId]
    pathToNavigate && navigate(pathToNavigate)
  }, [navigate, pagePathsMap])

  return (
    <NavigationMenu
      open={expandMainMenu}
      setOpen={toggleExpandMainMenu}
      activeItem={currentMenuItem}
      sidebarMenuItems={sidebarMenuItems}
      sidebarServiceMenuItems={sidebarServiceMenuItems}
      onSelectItem={navigateAndSelect}
    />
  )
})

VersionNavigationMenu.displayName = 'VersionNavigationMenu'

type VersionPagePathsInput = {
  packageKey: Key
  versionKey: Key
  tabs: VersionTabsApiTypesState['tabs']
  defaultOperationsView: OperationsViewMode
  expandMenu: boolean
}

const getPagePathsMap = ({
  packageKey,
  versionKey,
  tabs,
  defaultOperationsView,
  expandMenu,
}: VersionPagePathsInput): Record<string, To> => {
  const commonSearchParams = {
    [EXPAND_NAVIGATION_MENU_SEARCH_PARAM]: { value: expandMenu ? EXPAND_NAVIGATION_MENU : undefined },
  }
  const operationsSearchParams = {
    ...commonSearchParams,
    [OPERATIONS_VIEW_MODE_PARAM]: { value: defaultOperationsView },
  }

  const paths: Record<string, To> = {
    [OVERVIEW_PAGE]: getOverviewPath({
      packageKey: packageKey,
      versionKey: versionKey,
      search: commonSearchParams,
    }),
    [DOCUMENTS_PAGE]: getDocumentPath({ packageKey: packageKey, versionKey: versionKey, search: commonSearchParams }),
    [PACKAGE_SETTINGS_PAGE]: getPackageSettingsPath({ packageKey }),
  }

  addApiTypePagePath(
    paths,
    CONTRACTS_PAGE,
    tabs[VERSION_TAB_IDS.contracts].defaultApiType,
    apiType =>
      getOperationsPath({
        packageKey: packageKey,
        versionKey: versionKey,
        apiType: apiType,
        search: operationsSearchParams,
      }),
  )
  addApiTypePagePath(
    paths,
    API_CHANGES_PAGE,
    tabs[VERSION_TAB_IDS.apiChanges].defaultApiType,
    apiType =>
      getApiChangesPath({
        packageKey: packageKey,
        versionKey: versionKey,
        apiType: apiType,
        search: operationsSearchParams,
      }),
  )
  addApiTypePagePath(
    paths,
    DEPRECATED_PAGE,
    tabs[VERSION_TAB_IDS.deprecated].defaultApiType,
    apiType =>
      getDeprecatedPath({
        packageKey: packageKey,
        versionKey: versionKey,
        apiType: apiType,
        search: operationsSearchParams,
      }),
  )
  addApiTypePagePath(
    paths,
    API_QUALITY_PAGE,
    tabs[VERSION_TAB_IDS.apiQuality].defaultApiType,
    apiType =>
      getApiQualityPath({
        packageKey: packageKey,
        versionKey: versionKey,
        apiType: apiType,
        search: commonSearchParams,
      }),
  )

  return paths
}

const getAvailableSidebarMenuItems = (
  tabs: VersionTabsApiTypesState['tabs'],
  linterEnabled: boolean,
): SidebarMenu[] => {
  const contractsTab = tabs[VERSION_TAB_IDS.contracts]
  const apiChangesTab = tabs[VERSION_TAB_IDS.apiChanges]
  const deprecatedTab = tabs[VERSION_TAB_IDS.deprecated]
  const apiQualityTab = tabs[VERSION_TAB_IDS.apiQuality]

  const menuItems: SidebarMenu[] = [
    {
      id: OVERVIEW_PAGE,
      title: 'Overview',
      tooltip: 'Overview',
      icon: <ServicesIcon />,
      'data-testid': 'OverviewButton',
    },
    {
      id: CONTRACTS_PAGE,
      title: 'Contracts',
      tooltip: 'Contracts',
      disabled: contractsTab.disabled,
      icon: <ApiIcon />,
      'data-testid': 'ContractsButton',
    },
    {
      id: API_CHANGES_PAGE,
      title: 'API Changes',
      tooltip: apiChangesTab.tooltip ?? 'API Changes',
      disabled: apiChangesTab.disabled,
      icon: <ComparisonIcon />,
      'data-testid': 'ApiChangesButton',
    },
    {
      id: DEPRECATED_PAGE,
      title: 'Deprecated',
      tooltip: 'Deprecated',
      disabled: deprecatedTab.disabled,
      icon: <DefaultWarningIcon />,
      'data-testid': 'DeprecatedButton',
    },
    {
      id: DOCUMENTS_PAGE,
      title: 'Documents',
      tooltip: 'Documents',
      icon: <FileIcon />,
      'data-testid': 'DocumentsButton',
    },
  ]

  if (linterEnabled) {
    insertMenuItemAfter(menuItems, DEPRECATED_PAGE, {
      id: API_QUALITY_PAGE,
      title: 'API Quality',
      disabled: apiQualityTab.disabled,
      tooltip: apiQualityTab.tooltip ?? 'API Quality',
      icon: <CertifiedFileIcon />,
      'data-testid': 'ApiQualityButton',
    })
  }

  return menuItems
}

const getAvailableSidebarServiceMenuItems = (
  showSettings: boolean,
): SidebarMenu[] => {
  const sidebarServiceMenu: SidebarMenu[] = []

  if (showSettings) {
    sidebarServiceMenu.splice(0, 0, {
      id: PACKAGE_SETTINGS_PAGE,
      title: 'Settings',
      tooltip: 'Package Settings',
      icon: <SettingIcon color="#626D82" />,
      'data-testid': 'SettingsButton',
    })
  }

  return sidebarServiceMenu
}

function addApiTypePagePath(
  paths: Record<string, To>,
  pageId: string,
  defaultApiType: ApiType | ContractType | undefined,
  buildPath: (apiType: ApiType) => To,
): void {
  if (defaultApiType === undefined) {
    return
  }
  paths[pageId] = buildPath(defaultApiType as ApiType)
}

function insertMenuItemAfter(
  menuItems: SidebarMenu[],
  afterItemId: string,
  menuItem: SidebarMenu,
): void {
  const index = menuItems.findIndex(item => item.id === afterItemId)
  if (index === -1) {
    return
  }
  menuItems.splice(index + 1, 0, menuItem)
}
