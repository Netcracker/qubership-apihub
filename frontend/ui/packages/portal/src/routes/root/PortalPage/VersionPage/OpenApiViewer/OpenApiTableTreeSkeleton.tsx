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
import { Box, Skeleton, TableCell, TableRow } from '@mui/material'

export const OpenApiTableTreeSkeleton: FC = memo(() => {
  return (
    <>
      {Array(2).fill(0).map(() => {
        return (
          <TableRow key={crypto.randomUUID()}>
            <TableCell key={crypto.randomUUID()}>
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
