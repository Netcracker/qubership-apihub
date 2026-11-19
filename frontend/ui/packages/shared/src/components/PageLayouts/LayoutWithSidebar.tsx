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
  disableHorizontalDivider?: boolean
} & TestableProps
export const LayoutWithSidebar: FC<LayoutWithSidebarProps> = memo<LayoutWithSidebarProps>(({
  header,
  action,
  sidebar,
  body,
  disableHorizontalDivider,
  'data-testid': dataTestId,
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
      data-testid={dataTestId}
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
          {!disableHorizontalDivider && (
            <Divider
              orientation="horizontal"
              variant="fullWidth"
            />
          )}
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
