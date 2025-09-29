import { LoadingButton } from '@mui/lab'
import { Box, Button, IconButton } from '@mui/material'
import type { ButtonProps } from '@mui/material/Button/Button'
import Tooltip from '@mui/material/Tooltip'
import React, { FC, memo, ReactElement, ReactNode, useCallback, useMemo } from 'react'

export type ButtonWithHintProps = {
  hint?: string | ReactNode
  isLoading?: boolean
  title?: string
  startIcon?: ReactElement
  hintMaxWidth?: number | string
} & ButtonProps

export const ButtonWithHint: FC<ButtonWithHintProps> = memo<ButtonWithHintProps>((
  {
    title,
    isLoading,
    hint,
    startIcon,
    hintMaxWidth,
    ...buttonProps
  },
) => {
  const button = useMemo(() => {
    if (isLoading !== undefined) {
      return (
        <LoadingButton
          loading={isLoading}
          startIcon={startIcon}
          {...buttonProps}
        >
          {title}
        </LoadingButton>
      )
    }

    if (!title && startIcon) {
      return (
        <IconButton
          {...buttonProps}
        >
          {startIcon}
        </IconButton>
      )
    }

    return (
      <Button
        startIcon={startIcon}
        {...buttonProps}
      >
        {title}
      </Button>
    )
  }, [isLoading, title, startIcon, buttonProps])

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (buttonProps.disabled) {
      event.stopPropagation()
      event.preventDefault()
    }
  }, [buttonProps.disabled])

  return (
    <Tooltip
      title={hint}
      PopperProps={{
        sx: { '.MuiTooltip-tooltip': { maxWidth: hintMaxWidth } },
      }}
    >
      {
        // MUI disables mouse events for disabled elements.
        // `display: 'inline'` enables tooltips with minimal layout impact.
        // `handleClick` prevents click-through
      }
      <Box display="inline" onClick={handleClick}>
        {button}
      </Box>
    </Tooltip>
  )
})

ButtonWithHint.displayName = 'ButtonWithHint'
