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

  // TODO 12.07.23 Make this component more reusable & configurable

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
