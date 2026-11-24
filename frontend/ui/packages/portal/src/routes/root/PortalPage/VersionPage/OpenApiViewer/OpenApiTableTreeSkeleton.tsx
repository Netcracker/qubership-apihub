import type { FC } from 'react'
import React, { memo } from 'react'
import { Box, Skeleton, TableCell, TableRow } from '@mui/material'

export const OpenApiTableTreeSkeleton: FC = memo(() => {
  return (
    <>
      {Array(2).fill(0).map((_, index) => {
        return (
          <TableRow key={index}>
            <TableCell>
              <Box display="flex" flexDirection="column">
                <Skeleton sx={{ width: '100%', height: '32px' }}/>
                <Skeleton sx={{ width: '25%', height: '18px' }}/>
                <Skeleton sx={{ width: '40%', height: '24px' }}/>
              </Box>
            </TableCell>
          </TableRow>
        )
      })}
    </>
  )
})
