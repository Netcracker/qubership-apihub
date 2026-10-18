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

import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import Box from '@mui/material/Box'
import { BODY_GRID_AREA, createGridAreas, TABS_GRID_AREA } from '../../utils/page-layouts'

export type LayoutWithTabsProps = {
  tabs: ReactNode
  body: ReactNode
}
export const LayoutWithTabs: FC<LayoutWithTabsProps> = memo<LayoutWithTabsProps>(({ tabs, body }) => {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'grid',
        gridTemplateRows: 'max-content 1fr',
        gridTemplateColumns: 'auto 1fr',
        gridTemplateAreas: `${createGridAreas({ tabs })}`,
      }}
    >
      <Box
        sx={{
          gridArea: TABS_GRID_AREA,
          borderRight: '1px solid #D5DCE3',
          borderRadius: '10px 0 0 0',
          boxShadow: 'rgb(4 12 29 / 9%) 0px 0px 5px 0px',
        }}
      >
        {tabs}
      </Box>

      <Box sx={{
        gridArea: BODY_GRID_AREA,
        overflow: 'hidden',
      }}>
        {body}
      </Box>
    </Box>
  )
})

