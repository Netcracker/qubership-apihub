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
import { Button } from '@mui/material'
import type { ButtonProps } from '@mui/material/Button/Button'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import type { Property } from 'csstype'

export type OutlinedIconButtonProps = ButtonProps & Partial<{
  disabled: boolean
  disableHint: boolean
  hint: string | ReactNode
  tooltipMaxWidth?: Property.MaxWidth
}>

export const OutlinedIconButton: FC<OutlinedIconButtonProps> = memo(({
  startIcon,
  endIcon,
  disabled,
  disableHint,
  hint,
  tooltipMaxWidth,
  ...buttonProps
}) => {
  const bothIcons = startIcon && endIcon
  const width = bothIcons ? '48px' : '24px'

  // TODO 12.07.23 Make this component more re-usable & configurable

  return (
    <Tooltip
      disableHoverListener={disableHint}
      title={hint}
      PopperProps={{
        sx: { '.MuiTooltip-tooltip': { maxWidth: tooltipMaxWidth } },
      }}
    >
      <Box>
        <Button
          {...buttonProps}
          startIcon={startIcon}
          endIcon={endIcon}
          disabled={disabled}
          variant="outlined"
          sx={{
            '&.MuiButton-root': {
              width: width,
              minWidth: width,
              minHeight: '32px',
              '& .MuiButton-startIcon': {
                marginRight: '0px',
              },
              '& .MuiButton-endIcon': {
                marginLeft: '0px',
              },
            },
          }}
        />
      </Box>
    </Tooltip>
  )
})
