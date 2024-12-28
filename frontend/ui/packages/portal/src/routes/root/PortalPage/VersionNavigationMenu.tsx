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
import { memo, useCallback, useMemo } from 'react'
import type { To } from 'react-router-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { usePackageVersionContent } from '../usePackageVersionContent'
import type { Key } from '@apihub/entities/keys'

import {
  API_CHANGES_PAGE,
  CONFIGURATION_PAGE,
  DEPRECATED_PAGE,
  DOCUMENTS_PAGE,
  OPERATIONS_PAGE,
  OVERVIEW_PAGE,
  PACKAGE_SETTINGS_PAGE,
} from '../../../routes'

import {
  getApiChangesPath,
  getDeprecatedPath,
  getDocumentPath,
  getOperationsPath,
  getOverviewPath,
  getPackageSettingsPath,
  getVersionPath,
} from '../../NavigationProvider'
import { useOperationsView } from './VersionPage/useOperationsView'
import { getDefaultApiType } from '@apihub/utils/operation-types'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import type { SidebarMenu } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import { NavigationMenu } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import {
  EXPAND_NAVIGATION_MENU_SEARCH_PARAM,
  OPERATIONS_VIEW_MODE_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { EXPAND_NAVIGATION_MENU } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useExpandNavigationMenuSearchParam'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { ConfigureIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ConfigureIcon'
import { ServicesIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ServicesIcon'
import { ApiIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ApiIcon'
import { ComparisonIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ComparisonIcon'
import { DefaultWarningIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningIcon'
import { FileIcon } from '@netcracker/qubership-apihub-ui-shared/icons/FileIcon'
import { SettingIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SettingIcon'
import { usePortalPageSettingsContext } from '@apihub/routes/PortalPageSettingsProvider'
import type { OperationsViewMode } from '@netcracker/qubership-apihub-ui-shared/types/views'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { useSystemInfo } from '@netcracker/qubership-apihub-ui-shared/features/system-info'

export type VersionNavigationMenuProps = {
  menuItems: string[]
  showSettings?: boolean
}

export const VersionNavigationMenu: FC<VersionNavigationMenuProps> = memo<VersionNavigationMenuProps>(({
  menuItems,
  showSettings = false,
}) => {
  const navigate = useNavigate()
  const { productionMode } = useSystemInfo()

  const { packageId, versionId } = useParams()
  const { versionContent } = usePackageVersionContent({
    packageKey: packageId,
    versionKey: versionId,
    includeSummary: true,
  })
  const { previousVersion, operationTypes } = versionContent ?? {}
  const defaultApiType = useMemo(() => getDefaultApiType(operationTypes), [operationTypes])
  const { expandMainMenu, toggleExpandMainMenu, operationsViewMode } = usePortalPageSettingsContext()
  const [operationsView] = useOperationsView(operationsViewMode)

  const [currentMenuItem] = useActiveTabs()
  const sidebarMenuItems = useMemo(
    () => getAvailableSidebarMenuItems(previousVersion, defaultApiType, productionMode).filter(({ id }) => menuItems.includes(id)),
    [defaultApiType, menuItems, previousVersion, productionMode],
  )
  const sidebarServiceMenuItems = useMemo(
    () => getAvailableSidebarServiceMenuItems(showSettings).filter(({ id }) => menuItems.includes(id)),
    [menuItems, showSettings],
  )
  const pagePathsMap = useMemo(
    () => getPagePathsMap(packageId!, versionId!, defaultApiType, operationsView, expandMainMenu),
    [defaultApiType, operationsView, expandMainMenu, packageId, versionId],
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

const getPagePathsMap = (
  packageKey: Key,
  versionKey: Key,
  defaultApiType: ApiType,
  defaultOperationsView: OperationsViewMode,
  expandMenu: boolean,
): Record<string, To> => {
  const commonSearchParams = {
    [EXPAND_NAVIGATION_MENU_SEARCH_PARAM]: { value: expandMenu ? EXPAND_NAVIGATION_MENU : undefined },
  }

  return {
    [CONFIGURATION_PAGE]: getVersionPath({
      packageKey: packageKey,
      versionKey: versionKey ?? SPECIAL_VERSION_KEY,
      edit: true,
    }),
    [OVERVIEW_PAGE]: getOverviewPath({
      packageKey: packageKey,
      versionKey: versionKey,
      search: commonSearchParams,
    }),
    [OPERATIONS_PAGE]: getOperationsPath({
      packageKey: packageKey,
      versionKey: versionKey,
      apiType: defaultApiType,
      search: {
        ...commonSearchParams,
        [OPERATIONS_VIEW_MODE_PARAM]: { value: defaultOperationsView },
      },
    }),
    [API_CHANGES_PAGE]: getApiChangesPath({
      packageKey: packageKey,
      versionKey: versionKey,
      apiType: defaultApiType,
      search: {
        ...commonSearchParams,
        [OPERATIONS_VIEW_MODE_PARAM]: { value: defaultOperationsView },
      },
    }),
    [DEPRECATED_PAGE]: getDeprecatedPath({
      packageKey: packageKey,
      versionKey: versionKey,
      apiType: defaultApiType,
      search: {
        ...commonSearchParams,
        [OPERATIONS_VIEW_MODE_PARAM]: { value: defaultOperationsView },
      },
    }),
    [DOCUMENTS_PAGE]: getDocumentPath({ packageKey: packageKey, versionKey: versionKey, search: commonSearchParams }),
    [PACKAGE_SETTINGS_PAGE]: getPackageSettingsPath({ packageKey }),
  }
}

const getAvailableSidebarMenuItems = (
  previousVersion: Key | undefined,
  defaultApiType: ApiType,
  productionMode: boolean,
): SidebarMenu[] => {
  const disableTab = API_TYPE_DISABLE_TAB_MAP[defaultApiType](productionMode)

  return [
    {
      id: CONFIGURATION_PAGE,
      title: 'Configuration',
      tooltip: 'Configuration',
      icon: <ConfigureIcon/>,
      testId: 'ConfigureDashboardButton',
    },
    {
      id: OVERVIEW_PAGE,
      title: 'Overview',
      tooltip: 'Overview',
      icon: <ServicesIcon/>,
      testId: 'OverviewButton',
    },
    {
      id: OPERATIONS_PAGE,
      title: 'Operations',
      tooltip: 'Operations',
      icon: <ApiIcon/>,
      testId: 'OperationsButton',
    },
    {
      id: API_CHANGES_PAGE,
      title: 'API Changes',
      tooltip: !previousVersion ? 'No API changes since there is no previous version' : 'API Changes',
      disabled: !previousVersion || disableTab,
      icon: <ComparisonIcon/>,
      testId: 'ApiChangesButton',
    },
    {
      id: DEPRECATED_PAGE,
      title: 'Deprecated',
      tooltip: 'Deprecated',
      disabled: disableTab,
      icon: <DefaultWarningIcon/>,
      testId: 'DeprecatedButton',
    },
    {
      id: DOCUMENTS_PAGE,
      title: 'Documents',
      tooltip: 'Documents',
      icon: <FileIcon/>,
      testId: 'DocumentsButton',
    },
  ]
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
      icon: <SettingIcon color="#626D82"/>,
      testId: 'SettingsButton',
    })
  }

  return sidebarServiceMenu
}

const API_TYPE_DISABLE_TAB_MAP: Record<ApiType, (productionMode: boolean) => boolean> = {
  [API_TYPE_REST]: () => false,
  [API_TYPE_GRAPHQL]: (productionMode) => productionMode,
}
