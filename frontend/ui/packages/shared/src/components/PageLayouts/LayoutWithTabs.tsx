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

