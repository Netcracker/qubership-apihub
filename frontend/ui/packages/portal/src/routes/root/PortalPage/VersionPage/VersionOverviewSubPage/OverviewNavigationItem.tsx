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
import { Box, ListItem, ListItemButton, ListItemText, Tooltip } from '@mui/material'
import { PACKAGES_PAGE } from '../../../../../routes'
import type { To } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import { isNotEmptyMap } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { RedWarningIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningIcon'

type OverviewNavigationItemProps = Readonly<{
  url: To | undefined
  title: string
  id: string
  sidebarItem: string
  deletedReferences: Map<Key, number> | undefined
}> & TestableProps

export const OverviewNavigationItem: FC<OverviewNavigationItemProps> = memo<OverviewNavigationItemProps>(({
  url,
  title,
  id,
  testId,
  sidebarItem,
  deletedReferences,
}) => {
  const navigate = useNavigate()

  return (
    <ListItem
      key={crypto.randomUUID()}
      sx={{ p: 0 }}
    >
      <ListItemButton
        sx={{
          backgroundColor: id === sidebarItem ? '#F5F5FA' : 'transparent',
          height: '36px',
          alignItems: 'center',
        }}
        selected={id === sidebarItem}
        onClick={() => url && navigate(url)}
        data-testid={testId}
      >
        <ListItemText
          primaryTypographyProps={{ sx: { mt: 1 } }}
          primary={
            <Box sx={{ display: 'flex' }}>
              {title}
              <Box sx={{ ml: '5px' }}>
                {id === PACKAGES_PAGE && isNotEmptyMap(deletedReferences) &&
                  <Tooltip title="Some included package/dashboard versions no longer exist" placement="right">
                    <Box data-testid="NotExistAlert">
                      <RedWarningIcon/>
                    </Box>
                  </Tooltip>
                }
              </Box>
            </Box>
          }/>
      </ListItemButton>
    </ListItem>
  )
})
