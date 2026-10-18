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
import { BODY_GRID_AREA, createGridAreas, DEFAULT_PAGE_LAYOUT_GAP, TOOLBAR_GRID_AREA } from '../../utils/page-layouts'
import { DEFAULT_PAPER_SHADOW } from '../../themes/palette'

export type LayoutWithToolbarProps = {
  toolbar: ReactNode
  body: ReactNode
}
export const LayoutWithToolbar: FC<LayoutWithToolbarProps> = memo<LayoutWithToolbarProps>(({ toolbar, body }) => {
  return (
    <Box
      sx={{
        px: DEFAULT_PAGE_LAYOUT_GAP,
        height: '100%',
        display: 'grid',
        gridTemplateRows: 'max-content 1fr',
        gridTemplateColumns: 'auto 1fr',
        gridTemplateAreas: `${createGridAreas({ toolbar })}`,
      }}
    >
      <Box sx={{
        gridArea: TOOLBAR_GRID_AREA,
        overflow: 'hidden',
        mb: DEFAULT_PAGE_LAYOUT_GAP,
        backgroundColor: '#FFFFFF',
        borderRadius: '0 0 10px 10px',
        boxShadow: DEFAULT_PAPER_SHADOW,
      }}>
        {toolbar}
      </Box>

      <Box sx={{
        gridArea: BODY_GRID_AREA,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        borderRadius: '10px 10px 0 0',
        boxShadow: 'rgb(4 10 21 / 4%) 0px 1px 1px, rgb(4 12 29 / 9%) 0px 3px 14px, rgb(7 13 26 / 27%) 0px 0px 1px',
      }}>
        {body}
      </Box>
    </Box>
  )
})

