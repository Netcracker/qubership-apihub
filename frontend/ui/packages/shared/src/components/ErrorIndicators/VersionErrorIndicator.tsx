import { type FC, memo } from 'react'

import { useVersionProblemDetails } from '../../hooks/versions/useVersionProblemDetails'
import type { UseVersionProblemDetailsParams } from '../../hooks/versions/versionProblemDetails'
import type { TestableProps } from '../Testable'
import { ErrorIndicator, type ErrorIndicatorViewProps } from './ErrorIndicator'

type VersionErrorIndicatorProps =
  & TestableProps
  & UseVersionProblemDetailsParams
  & ErrorIndicatorViewProps

export const VersionErrorIndicator: FC<VersionErrorIndicatorProps> = memo<VersionErrorIndicatorProps>(({
  tooltip: customTooltip,
  showTooltip = true,
  tooltipPlacement = 'bottom',
  fontSize = 'small',
  tabIndex,
  className,
  'data-testid': dataTestId = 'VersionErrorIndicator',
  ...problemParams
}) => {
  const { hasProblems, tooltip: resolvedTooltip } = useVersionProblemDetails(problemParams)

  return (
    <ErrorIndicator
      hasProblems={hasProblems}
      tooltip={customTooltip ?? resolvedTooltip}
      showTooltip={showTooltip}
      tooltipPlacement={tooltipPlacement}
      fontSize={fontSize}
      tabIndex={tabIndex}
      className={className}
      data-testid={dataTestId}
    />
  )
})

VersionErrorIndicator.displayName = 'VersionErrorIndicator'
