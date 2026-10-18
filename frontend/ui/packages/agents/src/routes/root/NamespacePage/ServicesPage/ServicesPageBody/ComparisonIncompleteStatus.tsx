import type { FC } from 'react'

import { ErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/ErrorIndicator'
import { PUBLICATION_ERROR_MESSAGES } from '@netcracker/qubership-apihub-ui-shared/utils/publicationErrorMessages'

import { StatusContent } from './StatusContent'
import { COMPARISON_INCOMPLETE_MESSAGE } from './validationMessages'

export const ComparisonIncompleteStatus: FC = () => (
  <StatusContent
    marker={
      <ErrorIndicator
        hasProblems
        tooltip={PUBLICATION_ERROR_MESSAGES.packageVersion.changelog}
        fontSize="extra-small"
        data-testid="ComparisonIncompleteIndicator"
      />
    }
    text={COMPARISON_INCOMPLETE_MESSAGE}
  />
)

ComparisonIncompleteStatus.displayName = 'ComparisonIncompleteStatus'
