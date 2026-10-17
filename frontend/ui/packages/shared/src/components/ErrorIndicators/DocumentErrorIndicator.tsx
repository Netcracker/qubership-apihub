import { type FC, memo, type MouseEventHandler } from 'react'

import { PUBLICATION_ERROR_MESSAGES } from '../../utils/publicationErrorMessages'
import type { TestableProps } from '../Testable'
import { ErrorIndicator, type ErrorIndicatorViewProps } from './ErrorIndicator'

type DocumentErrorIndicatorProps = TestableProps & ErrorIndicatorViewProps & {
  hasErrors?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
}

export const DocumentErrorIndicator: FC<DocumentErrorIndicatorProps> = memo<DocumentErrorIndicatorProps>(({
  hasErrors = false,
  tooltip,
  showTooltip = true,
  tooltipPlacement = 'bottom',
  fontSize = 'small',
  tabIndex,
  className,
  onClick,
  'data-testid': dataTestId = 'DocumentErrorIndicator',
}) => {
  if (!hasErrors) {
    return null
  }

  return (
    <ErrorIndicator
      hasProblems={hasErrors}
      tooltip={tooltip ??
        (onClick
          ? PUBLICATION_ERROR_MESSAGES.document.itemErrorClickable
          : PUBLICATION_ERROR_MESSAGES.document.itemError)}
      showTooltip={showTooltip}
      tooltipPlacement={tooltipPlacement}
      fontSize={fontSize}
      tabIndex={tabIndex}
      className={className}
      onClick={onClick}
      data-testid={dataTestId}
    />
  )
})

DocumentErrorIndicator.displayName = 'DocumentErrorIndicator'
