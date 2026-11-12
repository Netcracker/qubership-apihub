import type { FC } from 'react'
import React, { memo } from 'react'
import { Box, Skeleton } from '@mui/material'

export const ActivityListSkeleton: FC = memo(() => {
  return (
    <Box>
      {[...Array(5)].map((_, index) => (
        <Box key={index} mb={2} pr={1}>
          <Box mb={1}>
            <Skeleton variant="rectangular" height={20} width="100%"/>
          </Box>
          <Box>
            <Skeleton variant="rectangular" height={50} width="100%"/>
          </Box>
        </Box>
      ))}
    </Box>
  )
})
