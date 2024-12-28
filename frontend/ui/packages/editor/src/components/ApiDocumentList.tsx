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
import { memo } from 'react'
import { Link, List, ListItem, ListItemIcon, ListItemText, Skeleton } from '@mui/material'
import type { To } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import { SpecLogo } from '@netcracker/qubership-apihub-ui-shared/components/SpecLogo'

export type ApiDocumentListProps = {
  isLoading: boolean
  value: ApiDocument[]
}

export const ApiDocumentList: FC<ApiDocumentListProps> = memo<ApiDocumentListProps>(({ value, isLoading }) => {
  if (isLoading) {
    return (
      <Skeleton variant="rectangular" width={150}/>
    )
  }

  return (
    <List>
      {value.map(({ type, title, url, subtitle }) => (
        <ListItem
          key={crypto.randomUUID()}
          sx={{ px: 0, alignItems: 'start' }}
        >
          <ListItemIcon sx={{ minWidth: 2, mt: 0, mr: 1 }}>
            <SpecLogo value={type}/>
          </ListItemIcon>
          <ListItemText
            primary={
              <Link
                component={NavLink}
                to={url}
              >
                {title}
              </Link>
            }
            secondary={subtitle}
            primaryTypographyProps={{ color: '#0068FF' }}
            secondaryTypographyProps={{ noWrap: true }}
          />
        </ListItem>
      ))}
    </List>
  )
})

export type ApiDocument = {
  type: string
  title: string
  subtitle: string
  url: To
}
