import type { FC, ReactNode } from 'react'
import React, { memo } from 'react'
import { Box } from '@mui/material'
import { SUB_HEADER_HEIGHT } from '../shared-styles'

export type OperationSubheaderProps = {
  actions: ReactNode
}
export const OperationSubheader: FC<OperationSubheaderProps> = memo<OperationSubheaderProps>(({
  actions,
}) => {

  return (
    <Box sx={headerStyles}>
      <Box ml="auto" p={1}>
        {actions}
      </Box>
    </Box>
  )
})

const headerStyles = {
  alignItems: 'center',
  borderBottom: '1px solid #D9D9D9',
  display: 'flex',
  height: SUB_HEADER_HEIGHT,
}
