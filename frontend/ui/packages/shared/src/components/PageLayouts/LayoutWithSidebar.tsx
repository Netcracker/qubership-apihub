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
import * as React from 'react'
import { memo } from 'react'
import Box from '@mui/material/Box'
import { Resizable } from 're-resizable'
import { Divider } from '@mui/material'
import { MEDIUM_TOOLBAR_SIZE, Toolbar } from '../Toolbar'
import type { TestableProps } from '../Testable'
import {
  BODY_GRID_AREA,
  createGridAreas,
  NAVIGATION_DEFAULT_WIDTH,
  NAVIGATION_MAX_WIDTH,
  NAVIGATION_MIN_WIDTH,
  SIDEBAR_GRID_AREA,
  TOOLBAR_GRID_AREA,
} from '../../utils/page-layouts'

export type LayoutWithSidebarProps = {
  header: ReactNode
  action?: ReactNode
  sidebar?: ReactNode
  body: ReactNode
} & TestableProps
export const LayoutWithSidebar: FC<LayoutWithSidebarProps> = memo<LayoutWithSidebarProps>(({
  header,
  action,
  sidebar,
  body,
  testId,
}) => {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'grid',
        gridTemplateRows: 'max-content 1fr',
        gridTemplateColumns: 'auto 1fr',
        gridTemplateAreas: `${createGridAreas({ toolbar: header, sidebar: sidebar })}`,
      }}
      data-testid={testId}
    >
      <Box sx={{
        gridArea: TOOLBAR_GRID_AREA,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
      }}>
        <Box>
          <Toolbar
            size={MEDIUM_TOOLBAR_SIZE}
            header={header}
            action={action}
          />
          <Divider orientation="horizontal" variant="fullWidth"/>
        </Box>
      </Box>

      {sidebar && (
        <Resizable
          style={{
            gridArea: SIDEBAR_GRID_AREA,
            overflow: 'hidden',
            position: 'relative',
            borderRight: '1px solid #D5DCE3',
            clipPath: 'inset(-10px 0px -10px -10px)',
            paddingBottom: '24px',
          }}
          handleStyles={{ right: { cursor: 'ew-resize' } }}
          defaultSize={{ width: NAVIGATION_DEFAULT_WIDTH, height: '100%' }}
          maxWidth={NAVIGATION_MAX_WIDTH}
          minWidth={NAVIGATION_MIN_WIDTH}
          enable={{
            top: false,
            right: true,
            bottom: false,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
        >
          {sidebar}
        </Resizable>
      )}

      <Box sx={{
        gridArea: BODY_GRID_AREA,
        overflow: 'hidden',
      }}>
        {body}
      </Box>
    </Box>
  )
})

