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

import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import type { SxProps } from '@mui/material'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import CancelIcon from '@mui/icons-material/Cancel'
import type { TooltipProps } from '@mui/material/Tooltip/Tooltip'

export type StatusMarkerProps = {
  value?: StatusMarkerVariant
  title?: ReactNode
  placement?: TooltipProps['placement']
}

export const StatusMarker: FC<StatusMarkerProps> = memo<StatusMarkerProps>(({ value, title = null, placement }) => {
  if (!value) {
    return null
  }

  return (
    <Tooltip title={title} placement={placement}>
      <Box
        display="flex"
        gap={0.5}
        alignItems="center"
        width="max-content"
      >
        {STATUS_MARKER_VARIANT_TO_ICON_MAP[value]}
      </Box>
    </Tooltip>
  )
})

export const LOADING_STATUS_MARKER_VARIANT = 'loading'
export const DEFAULT_STATUS_MARKER_VARIANT = 'default'
export const SUCCESS_STATUS_MARKER_VARIANT = 'success'
export const WARNING_STATUS_MARKER_VARIANT = 'warning'
export const ERROR_STATUS_MARKER_VARIANT = 'error'

export type StatusMarkerVariant =
  | typeof LOADING_STATUS_MARKER_VARIANT
  | typeof DEFAULT_STATUS_MARKER_VARIANT
  | typeof SUCCESS_STATUS_MARKER_VARIANT
  | typeof WARNING_STATUS_MARKER_VARIANT
  | typeof ERROR_STATUS_MARKER_VARIANT

const STATUS_ICON_SX: SxProps = {
  verticalAlign: 'inherit',
  fontSize: 18,
  cursor: 'pointer',
}

const STATUS_MARKER_VARIANT_TO_ICON_MAP: Record<StatusMarkerVariant, ReactNode> = {
  [LOADING_STATUS_MARKER_VARIANT]: <CircularProgress size={16} sx={STATUS_ICON_SX}/>,
  [DEFAULT_STATUS_MARKER_VARIANT]: <ErrorRoundedIcon color="info" sx={STATUS_ICON_SX}/>,
  [SUCCESS_STATUS_MARKER_VARIANT]: <CheckCircleRoundedIcon color="success" sx={STATUS_ICON_SX}/>,
  [WARNING_STATUS_MARKER_VARIANT]: <ErrorRoundedIcon color="warning" sx={STATUS_ICON_SX}/>,
  [ERROR_STATUS_MARKER_VARIANT]: <CancelIcon color="error" sx={STATUS_ICON_SX}/>,
}
