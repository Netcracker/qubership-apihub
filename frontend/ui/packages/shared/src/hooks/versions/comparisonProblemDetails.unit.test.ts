import { DASHBOARD_KIND, PACKAGE_KIND } from '../../entities/packages'
import { PUBLICATION_ERROR_MESSAGES } from '../../utils/publicationErrorMessages'
import { resolveComparisonHeaderProblemDetails } from './comparisonProblemDetails'

describe('resolveComparisonHeaderProblemDetails', () => {
  test('package kind with comparison errors returns T-05 tooltip', () => {
    const result = resolveComparisonHeaderProblemDetails({
      comparisonHasErrors: true,
      kind: PACKAGE_KIND,
    })

    expect(result).toEqual({
      hasProblems: true,
      tooltip: PUBLICATION_ERROR_MESSAGES.packageVersion.adHocComparison,
    })
  })

  test('dashboard kind with comparison errors returns T-06 tooltip', () => {
    const result = resolveComparisonHeaderProblemDetails({
      comparisonHasErrors: true,
      kind: DASHBOARD_KIND,
    })

    expect(result).toEqual({
      hasProblems: true,
      tooltip: PUBLICATION_ERROR_MESSAGES.dashboardVersion.adHocComparison,
    })
  })

  test('falsy comparisonHasErrors returns no problems', () => {
    expect(resolveComparisonHeaderProblemDetails({
      comparisonHasErrors: false,
      kind: PACKAGE_KIND,
    })).toEqual({ hasProblems: false })

    expect(resolveComparisonHeaderProblemDetails({
      comparisonHasErrors: undefined,
      kind: DASHBOARD_KIND,
    })).toEqual({ hasProblems: false })
  })
})
