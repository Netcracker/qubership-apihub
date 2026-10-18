/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
