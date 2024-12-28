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
import { Box, List, ListItem, ListItemButton, ListItemText } from '@mui/material'
import { useApiTypeSearchParam } from '../useApiTypeSearchParam'
import { API_TYPE_TITLE_MAP, API_TYPES } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export const ApiTypeListSelector: FC = memo(() => {
  const { apiType: selectedApiType, setApiTypeSearchParam } = useApiTypeSearchParam()

  return (
    <Box paddingTop={2} paddingBottom={1}>
      <List>
        {API_TYPES.map(apiType => {
          return (
            <ListItem
              key={crypto.randomUUID()}
              sx={{ p: 0 }}
            >
              <ListItemButton
                sx={{
                  height: '36px',
                  alignItems: 'center',
                }}
                selected={apiType === selectedApiType}
                onClick={() => setApiTypeSearchParam(apiType)}
                data-testid={`ApiTypeButton-${apiType}`}
              >
                <ListItemText primary={API_TYPE_TITLE_MAP[apiType]} primaryTypographyProps={{ sx: { mt: 1 } }}/>
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Box>
  )
})
