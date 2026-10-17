import { type FC, memo } from 'react'

import type { ComparisonHeaderProblemDetails } from '../../hooks/versions/comparisonProblemDetails'
import type { TestableProps } from '../Testable'
import { ErrorIndicator, type ErrorIndicatorViewProps } from './ErrorIndicator'

type ComparisonErrorIndicatorProps =
  & TestableProps
  & ErrorIndicatorViewProps
  & {
    problem?: ComparisonHeaderProblemDetails
  }

export const ComparisonErrorIndicator: FC<ComparisonErrorIndicatorProps> = memo<ComparisonErrorIndicatorProps>(({
  problem,
  tooltip: customTooltip,
  showTooltip = true,
  tooltipPlacement = 'bottom',
  fontSize = 'small',
  tabIndex,
  className,
  'data-testid': dataTestId = 'ComparisonErrorIndicator',
}) => {
  if (!problem?.hasProblems) {
    return null
  }

  return (
    <ErrorIndicator
      hasProblems={problem.hasProblems}
      tooltip={customTooltip ?? problem.tooltip}
      showTooltip={showTooltip}
      tooltipPlacement={tooltipPlacement}
      fontSize={fontSize}
      tabIndex={tabIndex}
      className={className}
      data-testid={dataTestId}
    />
  )
})

ComparisonErrorIndicator.displayName = 'ComparisonErrorIndicator'
