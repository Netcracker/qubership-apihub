import { type SxProps, type Theme, type TooltipProps, Typography } from '@mui/material'
import type { Variant } from '@mui/material/styles/createTypography'
import type { FC, PropsWithChildren, ReactNode } from 'react'

import { OverflowTooltip } from './OverflowTooltip'
import { TestableProps } from './TestableProps'

type TextWithTooltipProps =
  & {
    variant?: Variant | 'inherit'
    fontSize?: string | number
    color?: string
    tooltipText?: ReactNode
    tooltipPlacement?: TooltipProps['placement']
    sx?: SxProps<Theme>
  }
  & PropsWithChildren<{}>
  & TestableProps

export const TextWithOverflowTooltip: FC<TextWithTooltipProps> = ({
  variant = 'body2',
  fontSize,
  children,
  tooltipText = '',
  tooltipPlacement,
  sx,
  ['data-testid']: testId,
  ...props
}) => {
  return (
    <OverflowTooltip
      title={tooltipText}
      placement={tooltipPlacement}
      {...props}
    >
      <Typography noWrap variant={variant} fontSize={fontSize} sx={sx} data-testid={testId}>
        {children}
      </Typography>
    </OverflowTooltip>
  )
}
