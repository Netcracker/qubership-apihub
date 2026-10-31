import { http } from 'msw'

import type { VersionChangesSummaryDto } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { patchJsonResponse } from '@netcracker/qubership-apihub-ui-shared/mocks/patch-json-response'

// Contains no version marker of mock-version-flags.ts, so both versions of the pair keep their real flags.
const MOCK_SUMMARY_ERRORS_MARKER = 'errors-changes-summary'
const MOCK_REF_COMPARISON_ERRORS_MARKER = 'errors-ref-comparison'

export const comparisonHandlers = [
  http.get('*/api/v2/packages/:packageKey/versions/:versionKey/changes/summary', ({ request, params }) => {
    const previousVersion = new URL(request.url).searchParams.get('previousVersion') ?? ''
    const hasErrorsByName = String(params.versionKey).includes(MOCK_SUMMARY_ERRORS_MARKER) ||
      previousVersion.includes(MOCK_SUMMARY_ERRORS_MARKER)
    return patchJsonResponse<VersionChangesSummaryDto>(request, summary => {
      if (!('refs' in summary)) {
        return hasErrorsByName ? { ...summary, hasErrors: true } : summary
      }
      const refs = summary.refs.map(ref => (
        isErrorsRefComparison(ref.packageRef) || isErrorsRefComparison(ref.previousPackageRef)
          ? { ...ref, hasErrors: true }
          : ref
      ))
      return {
        ...summary,
        refs: refs,
        hasErrors: hasErrorsByName || summary.hasErrors || refs.some(({ hasErrors }) => hasErrors),
      }
    })
  }),
]

function isErrorsRefComparison(ref?: string): boolean {
  return ref?.includes(MOCK_REF_COMPARISON_ERRORS_MARKER) ?? false
}
