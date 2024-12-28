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
import { CONFIGURATION_PAGE } from '../../../../routes'
import { getVersionPath } from '../../../NavigationProvider'
import {
  useExpandNavigationMenuSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useExpandNavigationMenuSearchParam'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import { NavigationMenu } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { ConfigureIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ConfigureIcon'

export const PackageVersionNavigationMenu: FC = memo(() => {
  const navigate = useNavigate()
  const { packageId, versionId } = useParams()
  const [expand, setExpand] = useExpandNavigationMenuSearchParam()

  const [currentMenuItem] = useActiveTabs()
  const pagePathsMap = useMemo(() => getPagePathsMap(packageId!, versionId!), [packageId, versionId])

  const navigateAndSelect = useCallback((menuItemId: string): void => {
    const pathToNavigate = pagePathsMap[menuItemId]
    pathToNavigate && navigate(pathToNavigate)
  }, [navigate, pagePathsMap])

  return (
    <NavigationMenu
      open={expand}
      setOpen={setExpand}
      activeItem={currentMenuItem}
      sidebarMenuItems={SIDEBAR_MENU_ITEMS}
      onSelectItem={navigateAndSelect}
    />
  )
})

const getPagePathsMap = (
  packageKey: Key,
  versionKey: Key,
): Record<string, To> => {

  return {
    [CONFIGURATION_PAGE]: getVersionPath({
      packageKey: packageKey,
      versionKey: versionKey ?? SPECIAL_VERSION_KEY,
      edit: true,
    }),
  }
}

const SIDEBAR_MENU_ITEMS = [
  {
    id: CONFIGURATION_PAGE,
    title: 'Configuration',
    tooltip: 'Configuration',
    icon: <ConfigureIcon/>,
    testId: 'ConfigurePackageButton',
  },
]
