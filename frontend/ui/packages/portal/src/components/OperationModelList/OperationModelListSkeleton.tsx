import type { FC } from 'react'
import React, { memo } from 'react'
import { Box, Skeleton } from '@mui/material'

// First Order Component //
export const OperationModelListSkeleton: FC = memo(() => {
  return (
    <Box sx={{ ml: 1.75 }}>
      {[...Array(5)].map((_, index) => (
        <Box
          key={index}
          mt={2}
        >
          <Skeleton variant="rectangular" width="100%" height={18}/>
        </Box>
      ))}
    </Box>
  )
})
