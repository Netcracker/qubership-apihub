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
