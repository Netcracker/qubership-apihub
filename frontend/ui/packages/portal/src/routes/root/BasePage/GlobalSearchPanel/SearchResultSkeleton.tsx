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
