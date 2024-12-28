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

import type { FC, ReactElement, ReactNode } from 'react'
import * as React from 'react'
import { memo, useMemo } from 'react'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import { LoadingButton } from '@mui/lab'
import { Button, IconButton } from '@mui/material'
import type { ButtonProps } from '@mui/material/Button/Button'
import type { TooltipPlacement } from '../../types/tooltip'
import type { TestableProps } from '../Testable'

export type ButtonWithHintProps = {
  disabled?: boolean
  disableHint?: boolean
  hint?: string | ReactNode
  isLoading?: boolean
  title?: string
  startIcon?: ReactElement
  ['area-label']?: string
  tooltipMaxWidth?: number | string
  tooltipPlacement?: TooltipPlacement
  handleClose?: (event: React.SyntheticEvent | Event) => void
  handleOpen?: (event: React.SyntheticEvent | Event) => void
} & ButtonProps & TestableProps

const DISABLED_COLOR = '#00000026'

export const ButtonWithHint: FC<ButtonWithHintProps> = memo<ButtonWithHintProps>((
  {
    title,
    isLoading,
    hint,
    disableHint = false,
    startIcon,
    disabled = false,
    tooltipMaxWidth,
    tooltipPlacement,
    handleClose,
    handleOpen,
    testId,
    ...buttonProps
  }) => {

  const disabledIcon = useMemo(
    () => startIcon && React.cloneElement(startIcon, { color: DISABLED_COLOR }),
    [startIcon],
  )

  const icon = useMemo(
    () => (disabled ? disabledIcon : startIcon),
    [disabled, startIcon, disabledIcon],
  )

  const button = useMemo(() => {
    if (isLoading !== undefined) {
      return (
        <LoadingButton
          loading={isLoading}
          startIcon={icon}
          disabled={disabled}
          {...buttonProps}
          data-testid={testId}
        >
          {title}
        </LoadingButton>
      )
    }

    if (!title && icon) {
      return (
        <IconButton
          aria-label="delete-icon"
          disabled={disabled}
          {...buttonProps}
          data-testid={testId}
        >
          {icon}
        </IconButton>
      )
    }

    return (
      <Button
        startIcon={icon}
        disabled={disabled}
        {...buttonProps}
        data-testid={testId}
      >
        {title}
      </Button>
    )

  }, [buttonProps, disabled, icon, isLoading, title, testId])

  return (
    <Tooltip
      disableHoverListener={disableHint}
      title={hint}
      onClose={handleClose}
      onOpen={handleOpen}
      PopperProps={{
        sx: { '.MuiTooltip-tooltip': { maxWidth: tooltipMaxWidth } },
      }}
      placement={tooltipPlacement}
    >
      <Box sx={{ display: 'inline' }}>
        {button}
      </Box>
    </Tooltip>
  )
})
