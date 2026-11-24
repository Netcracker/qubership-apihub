import { Box } from '@mui/material'
import type { FC, PropsWithChildren } from 'react'
import * as React from 'react'
import { memo } from 'react'

// First Order Component //
export const ListBox: FC<PropsWithChildren> = memo(({ children }) => {
  return (
    <Box
      display="flex"
      boxSizing="border-box"
      height="100%"
      flexDirection="column"
      p={2} pb="0"
      overflow="auto"
    >
      {children}
    </Box>
  )
})
