import { Box, Skeleton } from '@mui/material'
import type { FC } from 'react'
import { memo } from 'react'

export const SearchResultSkeleton: FC = memo(() => {
  return (
    <Box>
      {[...Array(3)].map((_, index) => (
        <Box key={index} mb={2}>
          <Skeleton variant="rectangular" height={90} width="100%"/>
        </Box>
      ))}
    </Box>
  )
})
