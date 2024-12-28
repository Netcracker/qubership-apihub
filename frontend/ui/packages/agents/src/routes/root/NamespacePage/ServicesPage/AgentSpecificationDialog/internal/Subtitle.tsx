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
import { Box, Typography } from '@mui/material'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'

type SubtitleProps = {
  label: string
  value?: string
}

export const Subtitle: FC<SubtitleProps> = memo<SubtitleProps>(({ label, value }) => {
  return (
    <Box display="flex" gap="2px">
      <Typography
        variant="caption"
        fontWeight="bold"
        flexShrink={0}
        minWidth="50px"
      >
        {label}:
      </Typography>
      <OverflowTooltip title={value}>
        <Typography
          variant="caption"
          textOverflow="ellipsis"
          overflow="hidden"
          noWrap
          flexShrink={3}
          maxWidth="18vw"
        >
          {value}
        </Typography>
      </OverflowTooltip>
    </Box>
  )
})
