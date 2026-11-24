import type { ElementType, FC, PropsWithChildren } from 'react'
import * as React from 'react'
import type { Variant } from '@mui/material/styles/createTypography'
import type { TooltipProps } from '@mui/material/Tooltip/Tooltip'
import { OverflowTooltip } from './OverflowTooltip'
import type { Theme } from '@mui/material'
import { Typography } from '@mui/material'
import type { SxProps } from '@mui/system'
import type { TestableProps } from './Testable'

export type TextWithTooltipProps = {
  variant?: Variant | 'inherit'
  tooltipText?: React.ReactNode
  sx?: SxProps<Theme>
  typographyComponent?: ElementType
} & Omit<TooltipProps, 'children' | 'title'> & PropsWithChildren & TestableProps

// Note: with a Link child, ellipsis dots use body text colour, not link colour.
export const TextWithOverflowTooltip: FC<TextWithTooltipProps> = ({
  variant = 'body2',
  children,
  tooltipText = '',
  sx,
  typographyComponent,
  'data-testid': dataTestId,
  ...props
}) => {
  const typographyRoot =
    typographyComponent === undefined ? {} : { component: typographyComponent }

  return (
    <OverflowTooltip
      title={tooltipText}
      {...props}
    >
      <Typography noWrap variant={variant} {...typographyRoot} sx={sx} data-testid={dataTestId}>
        {children}
      </Typography>
    </OverflowTooltip>
  )
}

TextWithOverflowTooltip.displayName = 'TextWithOverflowTooltip'
