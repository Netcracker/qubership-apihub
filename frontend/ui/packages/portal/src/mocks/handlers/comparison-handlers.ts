import { bypass, http, HttpResponse } from 'msw'

import type { VersionChangesSummaryDto } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'

export const comparisonHandlers = [
  http.get('*/api/v2/packages/:packageKey/versions/:versionKey/changes/summary', async ({ request, params }) => {
    const versionKey = String(params.versionKey)
    const url = new URL(request.url)
    const previousVersion = url.searchParams.get('previousVersion') ?? ''
    const originalResponse = await fetch(bypass(request))
    if (!originalResponse.ok) {
      return originalResponse
    }
    const realData: VersionChangesSummaryDto = await originalResponse.json()
    const hasErrorsByName = versionKey.includes('errors-comparison-summary') ||
      previousVersion.includes('errors-comparison-summary')
    if (!('refs' in realData)) {
      return HttpResponse.json<VersionChangesSummaryDto>(hasErrorsByName ? { ...realData, hasErrors: true } : realData)
    }
    const refs = realData.refs.map(ref => (
      isErrorsRefComparison(ref.packageRef) || isErrorsRefComparison(ref.previousPackageRef)
        ? { ...ref, hasErrors: true }
        : ref
    ))
    return HttpResponse.json<VersionChangesSummaryDto>({
      ...realData,
      refs: refs,
      hasErrors: hasErrorsByName || realData.hasErrors || refs.some(({ hasErrors }) => hasErrors),
    })
  }),
]

function isErrorsRefComparison(ref?: string): boolean {
  return ref?.includes('errors-ref-comparison') ?? false
}
