import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
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
import {
  useNcServiceEnabled,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

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

  const ncServiceEnabled = useNcServiceEnabled()

  const sidebarMenuItems = useMemo(
    () => (!ncServiceEnabled
        ? MENU_ITEMS
        : [...MENU_ITEMS, {
          id: AUTOMATION_PAGE,
          title: 'Automation',
          tooltip: 'Automation',
          icon: <AutomationIcon/>,
          'data-testid': 'AutomationTabButton',
        }]
    ),
    [ncServiceEnabled],
  )

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

const MENU_ITEMS: SidebarMenu[] = [
  {
    id: SERVICES_PAGE,
    title: 'Cloud services',
    tooltip: 'Cloud services',
    icon: <CloudSettingsIcon/>,
    'data-testid': 'ServicesTabButton',
  },
  {
    id: SNAPSHOTS_PAGE,
    title: 'Snapshots',
    tooltip: 'Snapshots',
    icon: <SnapshotsIcon/>,
    'data-testid': 'SnapshotsTabButton',
  },
  {
    id: SECURITY_REPORTS_PAGE,
    route: `${SECURITY_REPORTS_PAGE}/${AUTHENTICATION_REPORTS_PAGE}`,
    title: 'Security Reports',
    tooltip: 'Security Reports',
    icon: <LockOpenIcon/>,
    'data-testid': 'SecurityReportsTabButton',
  },
]
