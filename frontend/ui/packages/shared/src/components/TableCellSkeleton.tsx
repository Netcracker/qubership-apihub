import type { FC } from 'react'
import React, { memo } from 'react'
import { Skeleton, TableCell } from '@mui/material'

export type TableCellSkeletonProps = {
  maxWidth?: number
}

export const TableCellSkeleton: FC<TableCellSkeletonProps> = memo<TableCellSkeletonProps>(({ maxWidth }) => {
  return (
    <TableCell>
      <Skeleton variant="rectangular" width={'80%'} sx={{ maxWidth: maxWidth }}/>
    </TableCell>
  )
})
