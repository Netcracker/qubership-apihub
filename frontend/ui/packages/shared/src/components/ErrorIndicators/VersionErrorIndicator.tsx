import { type FC, memo } from 'react'

import { useVersionProblemDetails } from '../../hooks/versions/useVersionProblemDetails'
import type { UseVersionProblemDetailsParams } from '../../hooks/versions/versionProblemDetails'
import type { TestableProps } from '../Testable'
import { ErrorIndicator, type ErrorIndicatorViewProps } from './ErrorIndicator'

type VersionErrorIndicatorProps =
  & TestableProps
  & UseVersionProblemDetailsParams
  & ErrorIndicatorViewProps

/**
 * Resolves the problem of a version from its flags and renders its error icon. Use it where nothing else resolves the
 * version, such as a table row, a toolbar, a header, or a list option. A field that calls `useVersionProblemDetails`
 * renders `VersionFieldErrorIndicator` instead, so the version is not resolved twice.
 */
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
