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
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Typography from '@mui/material/Typography'
import type { ChangesTooltipCategory } from './ChangesTooltip'
import { ChangesTooltip } from './ChangesTooltip'
import type { ChangeSeverity, ChangesSummary } from '../entities/change-severities'
import { CHANGE_SEVERITY_COLOR_MAP, CHANGE_SEVERITY_NAME_MAP } from '../entities/change-severities'

export type ChangesProps = {
  value: ChangesSummary | undefined
  mode?: 'default' | 'compact'
  zeroView?: boolean
  category?: ChangesTooltipCategory
}

export const Changes: FC<ChangesProps> = memo<ChangesProps>(({ value, mode = 'default', zeroView = false, category }) => {
  if (!value) {
    return null
  }

  return (
    <List component="span" sx={{ display: 'flex', p: 0, width: 'fit-content' }} data-testid="ChangesSummary">
      {Object.entries(value).map(([type, count]) => {
        if (!count && !zeroView) {
          return null
        }
        const changeName = CHANGE_SEVERITY_NAME_MAP[type as keyof ChangesSummary]
        const changeColor = CHANGE_SEVERITY_COLOR_MAP[type as keyof ChangesSummary]
        return (
          <ListItem component="span" key={type} sx={{ p: 0 }}>
            <ChangesTooltip changeType={type as ChangeSeverity} category={category} disableHoverListener={mode === 'default'}>
              <Box data-testid={type} display="flex" alignItems="baseline">
                <Box
                  component="span"
                  sx={{ background: changeColor, width: 8, height: 8, borderRadius: '50%', mr: 1 }}
                />
                <Typography noWrap component="span" sx={{ fontSize: 12, fontWeight: 500, color: '#8F9EB4', mr: 1.5 }}>
                  {mode === 'default' ? `${changeName}: ${count}` : count}
                </Typography>
              </Box>
            </ChangesTooltip>
          </ListItem>
        )
      })}
    </List>
  )
})
