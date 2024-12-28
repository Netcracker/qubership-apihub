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
import { Box, List, ListItemButton, ListItemText, Typography } from '@mui/material'
import { useActiveTabContentContext, useSetActiveTabContentContext } from './SettingsPage'
import type { To } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import type { SettingsPageRoute } from '../../../routes'
import { ROLES_HIERARCHY_PAGE, SYSTEM_ADMINISTRATORS_PAGE, SYSTEM_TOKENS_PAGE, USER_ROLES_PAGE } from '../../../routes'
import { getSettingsPath } from '../../NavigationProvider'

export const SettingsNavigation: FC = memo(() => {
  const activeTab = useActiveTabContentContext()
  const setActiveTab = useSetActiveTabContentContext()
  const navigate = useNavigate()
  const navigateAndSelect = useCallback((pathToNavigate: To): void => {
    navigate(pathToNavigate)
  }, [navigate])

  return (
    <Box display="flex" height="100%" width="100%" flexDirection="column" overflow="hidden">
      <Box
        display="flex"
        gap={2}
        marginX={2}
        paddingY={2}
        alignItems="center"
        justifyContent="space-between"
        width="100%"
      >
        <Typography variant="h3" noWrap>
          Portal Settings
        </Typography>
      </Box>
      <List>
        {SETTINGS_SIDEBAR_ITEMS.map(({ value, url, label, description }) => (
          <ListItemButton
            key={value}
            selected={activeTab === value}
            sx={{ justifyContent: 'center' }}
            onClick={() => {
              setActiveTab(value)
              navigateAndSelect(url)
            }}
          >
            <Box>
              <ListItemText primary={label}/>
              <ListItemText primary={description} primaryTypographyProps={{ color: '#626D82' }}/>
            </Box>
          </ListItemButton>
        ))}
      </List>
    </Box>
  )
})

export type SettingsNavItemProps = Readonly<{
  label: string
  description: string
  value: SettingsPageRoute
  url: To
}>

const SETTINGS_SIDEBAR_ITEMS: SettingsNavItemProps[] = [
  {
    label: 'User Roles',
    description: 'Configure user roles and permissions',
    value: USER_ROLES_PAGE,
    url: getSettingsPath({ tab: USER_ROLES_PAGE }),
  },
  {
    label: 'Roles Hierarchy',
    description: 'Configure roles hierarchy',
    value: ROLES_HIERARCHY_PAGE,
    url: getSettingsPath({ tab: ROLES_HIERARCHY_PAGE }),
  },
  {
    label: 'System Administrators',
    description: 'Assign sysadm role to the users',
    value: SYSTEM_ADMINISTRATORS_PAGE,
    url: getSettingsPath({ tab: SYSTEM_ADMINISTRATORS_PAGE }),
  },
  {
    label: 'System Tokens',
    description: 'Add a system access token',
    value: SYSTEM_TOKENS_PAGE,
    url: getSettingsPath({ tab: SYSTEM_TOKENS_PAGE }),
  },
  // {
  //   label: 'System Administrators',
  //   description: 'Assign sysadm role to the users',
  //   value: SYSTEM_ADMINISTRATORS_PAGE,
  //   url: getSettingsPath({ tab: SYSTEM_ADMINISTRATORS_PAGE }),
  // },
  // {
  //   label: 'System Tokens',
  //   description: 'Add a system access token',
  //   value: SYSTEM_TOKENS_PAGE,
  //   url: getSettingsPath({ tab: SYSTEM_TOKENS_PAGE }),
  // },
]
