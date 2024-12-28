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

export type ProjectEditorSidebarSkeletonProps = {
  count: number
}

export const FilesTabPanelSidebarSkeleton: FC<ProjectEditorSidebarSkeletonProps> = memo<ProjectEditorSidebarSkeletonProps>(({ count }) => {
  return (
    <Box sx={{ p: 2.5 }}>
      {[...Array(count)].map((_, index) => (
        <SkeletonItem key={index}/>
      ))}
    </Box>
  )
})

const SkeletonItem: FC = memo(() => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '16px auto',
        gridTemplateAreas: `
          'circle firstText'
        `,
        columnGap: 1,
        mb: '5px',
      }}
    >
      <Skeleton sx={{ gridArea: 'circle', alignSelf: 'center' }} variant="circular" width={15} height={15}/>
      <Skeleton sx={{ gridArea: 'firstText' }} variant="text" width={210} height={22}/>
    </Box>
  )
})
