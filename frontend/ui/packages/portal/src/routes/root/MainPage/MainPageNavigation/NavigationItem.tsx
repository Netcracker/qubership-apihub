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

import { Box, ListItemButton, ListItemIcon, ListItemText } from '@mui/material'
import type { Path } from '@remix-run/router'
import type { FC } from 'react'
import React, { memo } from 'react'
import { NavLink } from 'react-router-dom'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'

export type NavigationItemProps = Readonly<{
  to: Partial<Path>
  label: string
  icon?: React.ReactNode
  selected?: boolean
  packageKey?: string
}> & TestableProps

export const NavigationItem: FC<NavigationItemProps> = memo<NavigationItemProps>(props => {
  const { to, icon, label, packageKey, testId, selected } = props

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      height: '32px',
      mb: packageKey ? '8px' : '16px',
      pr: '6px',
    }}>
      <ListItemButton
        component={NavLink}
        to={to}
        selected={selected}
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          pl: selected ? '14px' : '16px',
          borderLeft: selected ? '2px solid #0068FF' : '',
          backgroundColor: 'transparent!important',
          color: selected ? '#0068FF' : '',
          '&:hover': { color: '#0068FF', pl: '14px', borderLeft: '2px solid #0068FF' },
          '&:hover .MuiListItemIcon-root': { color: '#0068FF' },
        }}
        data-testid={testId}
      >
        <ListItemIcon
          sx={{
            mr: '8px',
            mt: 0,
            width: '24px',
            minWidth: '24px',
            color: selected ? '#0068FF' : '',
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText sx={{ fontWeight: 500 }} primary={label}/>
      </ListItemButton>
    </Box>
  )
})
