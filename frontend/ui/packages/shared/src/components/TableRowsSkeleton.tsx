import type { FC } from 'react'
import { memo } from 'react'
import { Skeleton, TableCell, TableRow } from '@mui/material'

export type TableRowsSkeletonProps = {
  cellsCount: number
  rowsCount?: number
}
export const TableRowsSkeleton: FC<TableRowsSkeletonProps> = memo<TableRowsSkeletonProps>(({
  rowsCount = 5,
  cellsCount,
}) => {
  return (
    <>
      {[...Array(rowsCount)].map((row, index) => (
        <TableRow key={`row-${index}`}>
          {[...Array(cellsCount)].map((cell, index) => (
            <TableCell component="th" scope="row" key={`cell-${index}`}>
              <Skeleton variant="text"/>
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
})
