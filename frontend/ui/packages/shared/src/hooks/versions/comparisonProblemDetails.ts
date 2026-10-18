import { DASHBOARD_KIND, type PackageKind } from '../../entities/packages'
import { PUBLICATION_ERROR_MESSAGES } from '../../utils/publicationErrorMessages'

export type ComparisonHeaderProblemDetails = Readonly<{
  hasProblems: boolean
  tooltip?: string
}>

type ResolveComparisonHeaderProblemDetailsParams = Readonly<{
  comparisonHasErrors?: boolean
  kind: PackageKind
}>

const NO_COMPARISON_HEADER_PROBLEMS: ComparisonHeaderProblemDetails = {
  hasProblems: false,
}

export function resolveComparisonHeaderProblemDetails(
  params: ResolveComparisonHeaderProblemDetailsParams,
): ComparisonHeaderProblemDetails {
  if (!params.comparisonHasErrors) {
    return NO_COMPARISON_HEADER_PROBLEMS
  }

  const tooltip = params.kind === DASHBOARD_KIND
    ? PUBLICATION_ERROR_MESSAGES.dashboardVersion.adHocComparison
    : PUBLICATION_ERROR_MESSAGES.packageVersion.adHocComparison

  return { hasProblems: true, tooltip: tooltip }
}
