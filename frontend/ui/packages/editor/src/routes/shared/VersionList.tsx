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

import type { ReactNode } from 'react'
import { memo } from 'react'
import { List, ListItem, ListItemButton, ListItemText } from '@mui/material'
import type { PackageVersions } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'

export type VersionListProps = Partial<{
  versions: PackageVersions
  selectedVersion: string
  onSelectVersion: (selectedVersion: string) => void
  action: ReactNode
}>

export const VersionList = memo<VersionListProps>(({ versions, selectedVersion, onSelectVersion, action }) => {
  return (
    <List disablePadding sx={{ height: '100%' }}>
      {versions?.map(({ key, status }) => (
        <ListItem
          disablePadding
          key={key}
          secondaryAction={action}
        >
          <ListItemButton
            key={key}
            selected={selectedVersion === key}
            onClick={() => onSelectVersion?.(key)}
          >
            <ListItemText primary={key}/>
            <CustomChip value={status}/>
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  )
})
