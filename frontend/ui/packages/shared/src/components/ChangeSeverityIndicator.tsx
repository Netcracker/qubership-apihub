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
import { Box } from '@mui/material'
import type { SxProps } from '@mui/system'
import type { ChangeSeverity } from '../entities/change-severities'
import { CHANGE_SEVERITY_COLOR_MAP } from '../entities/change-severities'

export type ChangeSeverityIndicatorProps = {
  severity: ChangeSeverity
  sx?: SxProps
}

export const ChangeSeverityIndicator: FC<ChangeSeverityIndicatorProps> = memo<ChangeSeverityIndicatorProps>(({
  severity,
  sx,
}) => {
  return <Box
    sx={{
      position: 'absolute',
      backgroundColor: CHANGE_SEVERITY_COLOR_MAP[severity],
      height: '100%',
      width: '5px',
      fontSize: 13,
      color: 'transparent',
      overflow: 'hidden',
      transition: 'all 0.3s ease-in-out',
      '&:hover': {
        color: '#FFFFFF',
        padding: '5px',
        width: 'auto',
      },
      ...sx,
    }}
    data-testid="ChangeSeverityIndicator">
    {severity}
  </Box>
})
