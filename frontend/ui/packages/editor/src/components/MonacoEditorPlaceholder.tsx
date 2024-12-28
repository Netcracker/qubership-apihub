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
import { Box, Skeleton, Typography } from '@mui/material'

export const MonacoEditorPlaceholder: FC = memo(() => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '60px 1fr',
        gap: 0.25,
        width: '100%',
        height: 'fit-content',
        px: 4,
        py: 2,
      }}
    >
      {
        widths.map((width, index) => (
          <Typography
            key={index}
            width={width}
            variant="caption"
          >
            <Skeleton/>
          </Typography>
        ))
      }
    </Box>
  )
})

const widths = [
  '100%',
  '50%',
  '100%',
  '25%',
  '100%',
  '75%',
  '100%',
  '0%',
  '100%',
  '15%',
  '100%',
  '35%',
  '100%',
  '85%',
  '100%',
  '65%',
  '100%',
  '35%',
  '100%',
  '45%',
  '100%',
  '15%',
  '100%',
  '55%',
]
