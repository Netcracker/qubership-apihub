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

import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded'
import PermIdentityIcon from '@mui/icons-material/PermIdentity'
import { Box, Divider, InputLabel, List } from '@mui/material'
import type { Path } from '@remix-run/router'
import type { FC } from 'react'
import React, { memo } from 'react'
import { usePackages } from '../../usePackages'
import { useSelectedWorkspaceContexts, useWorkspacesContexts } from '../MainPageProvider'
import { NavigationItem } from './NavigationItem'
import WorkspacesOutlinedIcon from '@mui/icons-material/WorkspacesOutlined'
import { useDeepCompareEffect, useLocation } from 'react-use'
import { getWorkspacePath } from '../../../NavigationProvider'
import type { MainPageRoute } from '../../../../routes'
import { FAVORITE_PAGE, PRIVATE_PAGE, SHARED_PAGE, WORKSPACES_PAGE } from '../../../../routes'
import { useParams } from 'react-router'
import { WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { WORKSPACES_PAGE_REFERER } from '@apihub/entities/referer-pages-names'

const DIVIDER_STYLES = {
  borderWidth: 0,
  borderBottomWidth: 1,
  borderColor: '#D9D9D9',
  m: 0,
  mb: '15px',
}

const LABEL_STYLES = {
  mb: '22px',
  ml: '18px',
  fontSize: '13px',
}

export const MainPageNavigation: FC = memo(() => {
  const { workspaceKey } = useParams()

  const [workspaces] = usePackages({
    kind: WORKSPACE_KIND,
    onlyFavorite: true,
    refererPageKey: workspaceKey ?? WORKSPACES_PAGE_REFERER,
  })
  const [, setWorkspaces] = useWorkspacesContexts()
  const [selectedWorkspace] = useSelectedWorkspaceContexts()
  const { pathname } = useLocation()

  useDeepCompareEffect(() => {
    workspaces && setWorkspaces(workspaces)
  }, [workspaces, setWorkspaces])

  return (
    <Box sx={{ width: '20%', maxWidth: '180px' }} data-testid="PortalSidebar">
      <List>
        {MAIN_PAGE_NAVIGATION_ITEMS.map(({ id, label, to, icon, testId }) => (
          <NavigationItem
            key={id}
            to={to}
            label={label}
            icon={icon}
            testId={testId}
            selected={pathname?.includes(id)}
          />
        ))}
        <Divider flexItem sx={DIVIDER_STYLES}/>
        <InputLabel sx={LABEL_STYLES}>
          Favorite workspaces
        </InputLabel>
        {workspaces && workspaces.map((item) => (
          <NavigationItem
            key={item?.key}
            to={getWorkspacePath({ workspaceKey: item?.key })}
            packageKey={item?.key}
            label={item?.name}
            selected={item.key === selectedWorkspace?.key}
          />
        ))}
      </List>
    </Box>
  )
})

type MainPageNavigationItem = Readonly<{
  id: MainPageRoute
  to: Partial<Path>
  label: string
  icon: React.ReactNode
  testId: string
}>

const MAIN_PAGE_NAVIGATION_ITEMS: MainPageNavigationItem[] = [
  {
    id: FAVORITE_PAGE,
    to: { pathname: 'favorite' },
    label: 'Favorite',
    icon: <StarOutlineRoundedIcon fontSize="medium"/>,
    testId: 'FavoritesButton',
  },
  {
    id: SHARED_PAGE,
    to: { pathname: 'shared' },
    label: 'Shared',
    icon: <GroupsOutlinedIcon fontSize="medium"/>,
    testId: 'SharedButton',
  },
  {
    id: PRIVATE_PAGE,
    to: { pathname: 'private' },
    label: 'Private',
    icon: <PermIdentityIcon fontSize="medium"/>,
    testId: 'PrivateButton',
  },
  {
    id: WORKSPACES_PAGE,
    to: { pathname: 'workspaces' },
    label: 'Workspaces',
    icon: <WorkspacesOutlinedIcon/>,
    testId: 'WorkspacesButton',
  },
]
