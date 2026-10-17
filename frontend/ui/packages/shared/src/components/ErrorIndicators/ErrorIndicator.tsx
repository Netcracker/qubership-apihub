import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import Tooltip, { tooltipClasses, type TooltipProps } from '@mui/material/Tooltip'
import { type FC, memo, type MouseEventHandler, type ReactNode } from 'react'

import { ErrorIcon } from '../../icons/ErrorIcon'
import type { TestableProps } from '../Testable'

const ERROR_INDICATOR_ARIA_LABEL = 'Publication error'

export type ErrorIndicatorViewProps = {
  tooltip?: ReactNode
  showTooltip?: boolean
  tooltipPlacement?: TooltipProps['placement']
  fontSize?: SvgIconProps['fontSize']
  tabIndex?: number
  className?: string
}

type ErrorIndicatorProps = TestableProps & ErrorIndicatorViewProps & {
  hasProblems?: boolean
  ariaLabel?: string
  onClick?: MouseEventHandler<HTMLButtonElement>
}

export const ErrorIndicator: FC<ErrorIndicatorProps> = memo<ErrorIndicatorProps>(({
  hasProblems = false,
  tooltip,
  showTooltip = true,
  tooltipPlacement = 'bottom',
  fontSize = 'small',
  ariaLabel,
  tabIndex: propTabIndex,
  className,
  onClick,
  'data-testid': dataTestId = 'ErrorIndicator',
}) => {
  if (!hasProblems) {
    return null
  }

  const resolvedAriaLabel = ariaLabel ??
    (showTooltip && typeof tooltip === 'string' ? tooltip : ERROR_INDICATOR_ARIA_LABEL)
  const tooltipContent = showTooltip ? tooltip : undefined
  const resolvedTabIndex = propTabIndex ?? (showTooltip && tooltipContent && !onClick ? 0 : undefined)

  const wrappedContent = onClick
    ? (
      <IconButton
        className={className}
        onClick={onClick}
        aria-label={resolvedAriaLabel}
        data-testid={dataTestId}
        size="small"
      >
        <ErrorIcon
          color="error"
          fontSize={fontSize}
        />
      </IconButton>
    )
    : (
      <IndicatorRoot
        className={className}
        role="img"
        tabIndex={resolvedTabIndex}
        aria-label={resolvedAriaLabel}
      >
        <ErrorIcon
          color="error"
          fontSize={fontSize}
          data-testid={dataTestId}
        />
      </IndicatorRoot>
    )

  if (!tooltipContent) {
    return wrappedContent
  }

  return (
    <IndicatorTooltip
      title={tooltipContent}
      placement={tooltipPlacement}
      disableInteractive
    >
      {wrappedContent}
    </IndicatorTooltip>
  )
})

ErrorIndicator.displayName = 'ErrorIndicator'

const IndicatorRoot = styled(Box)({
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'center',
  flexShrink: 0,
  cursor: 'default',
  userSelect: 'none',
})

const IndicatorTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 668,
    whiteSpace: 'pre-line',
  },
})
