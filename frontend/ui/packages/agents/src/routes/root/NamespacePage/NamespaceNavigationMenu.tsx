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
import { useParams } from 'react-router-dom'

import {
  AUTHENTICATION_REPORTS_PAGE,
  AUTOMATION_PAGE,
  SECURITY_REPORTS_PAGE,
  SERVICES_PAGE,
  SNAPSHOTS_PAGE,
} from '../../routes'
import { useNavigation } from '../../NavigationProvider'
import { useNcAgentsPageSettings } from '../../useNcAgentsPageSettings'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import type { SidebarMenu } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import { NavigationMenu } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import { CloudSettingsIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CloudSettingsIcon'
import { SnapshotsIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SnapshotsIcon'
import { AutomationIcon } from '@netcracker/qubership-apihub-ui-shared/icons/AutomationIcon'
import { LockOpenIcon } from '@netcracker/qubership-apihub-ui-shared/icons/LockOpenIcon'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'

export const NamespaceNavigationMenu: FC = memo(() => {
  const { agentId, namespaceKey: namespaceId } = useParams()
  const workspace = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const { navigateToNamespace } = useNavigation()

  const { expandMainMenu, toggleExpandMainMenu } = useNcAgentsPageSettings()

  const [currentMenuItem] = useActiveTabs()

  const navigateAndSelect = useCallback((menuItemId: string): void => {
    navigateToNamespace({
      agentId: agentId!,
      namespaceKey: namespaceId!,
      mode: menuItemId,
      search: { [WORKSPACE_SEARCH_PARAM]: { value: workspace } },
    })
  }, [agentId, namespaceId, navigateToNamespace, workspace])

  return (
    <NavigationMenu
      open={expandMainMenu}
      setOpen={toggleExpandMainMenu}
      activeItem={currentMenuItem}
      sidebarMenuItems={MENU_ITEMS}
      onSelectItem={navigateAndSelect}
    />
  )
})

const MENU_ITEMS: SidebarMenu[] = [
  {
    id: SERVICES_PAGE,
    title: 'Cloud services',
    tooltip: 'Cloud services',
    icon: <CloudSettingsIcon/>,
    testId: 'ServicesTabButton',
  },
  {
    id: SNAPSHOTS_PAGE,
    title: 'Snapshots',
    tooltip: 'Snapshots',
    icon: <SnapshotsIcon/>,
    testId: 'SnapshotsTabButton',
  },
  {
    id: AUTOMATION_PAGE,
    title: 'Automation',
    tooltip: 'Automation',
    icon: <AutomationIcon/>,
    testId: 'AutomationTabButton',
  },
  {
    id: `${SECURITY_REPORTS_PAGE}/${AUTHENTICATION_REPORTS_PAGE}`,
    title: 'Security Reports',
    tooltip: 'Security Reports',
    icon: <LockOpenIcon/>,
    testId: 'SecurityReportsTabButton',
  },
]
