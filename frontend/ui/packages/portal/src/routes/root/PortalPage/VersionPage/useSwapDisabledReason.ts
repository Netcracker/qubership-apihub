import { useVersionProblemDetails } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/useVersionProblemDetails'
import { VERSION_PROBLEM_DIALOG_SURFACE } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/versionProblemDetails'
import { PUBLICATION_ERROR_MESSAGES } from '@netcracker/qubership-apihub-ui-shared/utils/publicationErrorMessages'

import { usePackageVersionContent } from '../../usePackageVersionContent'
import { isRevisionCompare } from './isRevisionCompare'
import { useVersionsComparisonGlobalParams } from './VersionsComparisonGlobalParams'

export function useSwapDisabledReason(): string | undefined {
  const { originVersionKey, changedPackageKey, changedVersionKey } = useVersionsComparisonGlobalParams()
  const { versionContent } = usePackageVersionContent({
    packageKey: changedPackageKey,
    versionKey: changedVersionKey,
    enabled: !!changedPackageKey && !!changedVersionKey,
  })
  const isRevisions = !!originVersionKey && !!changedVersionKey &&
    isRevisionCompare(originVersionKey, changedVersionKey)

  const { isBlocking } = useVersionProblemDetails({
    packageKey: changedPackageKey,
    versionKey: changedVersionKey,
    hasErrors: versionContent?.hasErrors,
    changelogHasErrors: versionContent?.changelogHasErrors,
    apiProcessorVersion: versionContent?.apiProcessorVersion,
    surface: isRevisions
      ? VERSION_PROBLEM_DIALOG_SURFACE.COMPARE_PREVIOUS_REVISION
      : VERSION_PROBLEM_DIALOG_SURFACE.COMPARE_PREVIOUS_VERSION,
  })

  if (!isBlocking) {
    return undefined
  }

  return isRevisions
    ? PUBLICATION_ERROR_MESSAGES.comparison.swapRevisionUnavailable
    : PUBLICATION_ERROR_MESSAGES.comparison.swapVersionUnavailable
}
