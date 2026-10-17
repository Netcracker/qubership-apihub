import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import Tooltip from '@mui/material/Tooltip'
import { type FC, memo } from 'react'

import { RedWarningCircleIcon, YellowWarningCircleIcon } from '../icons/WarningCircleIcon'
import type { TestableProps } from './Testable'

type DotIndicatorColor = 'error' | 'warning'

type DotIndicatorProps = TestableProps & {
  color: DotIndicatorColor
  tooltip?: string
  tabIndex?: number
  className?: string
}

const DOT_INDICATOR_ICONS: Record<DotIndicatorColor, FC> = {
  error: RedWarningCircleIcon,
  warning: YellowWarningCircleIcon,
}

export const DotIndicator: FC<DotIndicatorProps> = memo<DotIndicatorProps>(({
  color,
  tooltip,
  tabIndex = 0,
  className,
  'data-testid': dataTestId = 'DotIndicator',
}) => {
  const Icon = DOT_INDICATOR_ICONS[color]

  if (!tooltip) {
    return (
      <DotRoot className={className} aria-hidden data-testid={dataTestId}>
        <Icon />
      </DotRoot>
    )
  }

  return (
    <Tooltip title={tooltip} placement="right" disableInteractive>
      <DotRoot className={className} role="img" tabIndex={tabIndex} aria-label={tooltip} data-testid={dataTestId}>
        <Icon />
      </DotRoot>
    </Tooltip>
  )
})

DotIndicator.displayName = 'DotIndicator'

const DotRoot = styled(Box)({
  display: 'flex',
})
