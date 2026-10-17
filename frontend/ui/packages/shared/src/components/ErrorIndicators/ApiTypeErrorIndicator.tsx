import { type FC, memo } from 'react'

import type { ApiTypeProblemDetails } from '../../hooks/versions/apiTypeProblemDetails'
import type { TestableProps } from '../Testable'
import { ErrorIndicator, type ErrorIndicatorViewProps } from './ErrorIndicator'

type ApiTypeErrorIndicatorProps = TestableProps & ErrorIndicatorViewProps & {
  problem?: ApiTypeProblemDetails
}

export const ApiTypeErrorIndicator: FC<ApiTypeErrorIndicatorProps> = memo<ApiTypeErrorIndicatorProps>(({
  problem,
  tooltip: customTooltip,
  showTooltip = true,
  tooltipPlacement = 'bottom',
  fontSize = 'small',
  tabIndex,
  className,
  'data-testid': dataTestId = 'ApiTypeErrorIndicator',
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

ApiTypeErrorIndicator.displayName = 'ApiTypeErrorIndicator'
