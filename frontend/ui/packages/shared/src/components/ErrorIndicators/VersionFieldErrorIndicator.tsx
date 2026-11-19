import { type FC, memo } from 'react'

import type { VersionProblemDetails } from '../../hooks/versions/versionProblemDetails'
import type { TestableProps } from '../Testable'
import { ErrorIndicator, type ErrorIndicatorViewProps } from './ErrorIndicator'

type VersionFieldErrorIndicatorProps = TestableProps & ErrorIndicatorViewProps & {
  problem: VersionProblemDetails
}

/**
 * Renders the error icon of a version field from the problem that the field resolved with `useVersionProblemDetails`,
 * so the icon matches the error state, the message and the blocking of that field. Use it in a field that calls the
 * hook; elsewhere use `VersionErrorIndicator`, which resolves the version flags itself.
 */
export const VersionFieldErrorIndicator: FC<VersionFieldErrorIndicatorProps> = memo<VersionFieldErrorIndicatorProps>(({
  problem,
  tooltip,
  'data-testid': dataTestId = 'VersionErrorIndicator',
  ...viewProps
}) => (
  <ErrorIndicator
    hasProblems={problem.hasProblems}
    tooltip={tooltip ?? problem.tooltip}
    {...viewProps}
    data-testid={dataTestId}
  />
))

VersionFieldErrorIndicator.displayName = 'VersionFieldErrorIndicator'
