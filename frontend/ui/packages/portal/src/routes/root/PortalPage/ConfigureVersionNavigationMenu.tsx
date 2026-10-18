import { type FC, memo, useCallback, useMemo } from 'react'
import { type To, useNavigate, useParams } from 'react-router-dom'

import type { SidebarMenu } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import { NavigationMenu } from '@netcracker/qubership-apihub-ui-shared/components/NavigationMenu'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import {
  useExpandNavigationMenuSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useExpandNavigationMenuSearchParam'
import { ConfigureIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ConfigureIcon'

import { CONFIGURATION_PAGE } from '../../../routes'
import { getVersionPath } from '../../NavigationProvider'

export const ConfigureVersionNavigationMenu: FC = memo(() => {
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

ConfigureVersionNavigationMenu.displayName = 'ConfigureVersionNavigationMenu'

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

const SIDEBAR_MENU_ITEMS: SidebarMenu[] = [
  {
    id: CONFIGURATION_PAGE,
    title: 'Configuration',
    tooltip: 'Configuration',
    icon: <ConfigureIcon />,
    'data-testid': 'ConfigureVersionButton',
  },
]
