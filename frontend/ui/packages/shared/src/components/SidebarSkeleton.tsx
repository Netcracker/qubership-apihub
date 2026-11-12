import type { FC } from 'react'
import { memo } from 'react'
import { Box, Skeleton } from '@mui/material'

export type SidebarSkeletonProps = {
  count?: number
}

export const SidebarSkeleton: FC<SidebarSkeletonProps> = memo<SidebarSkeletonProps>(({ count = 6 }) => {
  return (
    <Box sx={{ ml: 1.75 }}>
      {[...Array(count)].map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'grid',
            gridTemplateRows: 'auto auto',
            gridTemplateAreas: `
          'first'
          'second'
        `,
            gap: '2px',
          }}
        >
          <Skeleton sx={{ gridArea: 'first' }} variant="rectangular" width={116} height={15}/>
          <Skeleton sx={{ gridArea: 'second', mb: 0.75 }} variant="rectangular" width={54} height={15}/>
        </Box>
      ))}
    </Box>
  )
})
