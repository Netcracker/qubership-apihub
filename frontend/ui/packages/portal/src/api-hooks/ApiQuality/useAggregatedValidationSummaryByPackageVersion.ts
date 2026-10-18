import { IssueSeverities } from '@apihub/entities/api-quality/issue-severities'
import type { IssuesSummary, ValidationSummary } from '@apihub/entities/api-quality/package-version-validation-summary'
import { useMemo } from 'react'

export function useAggregatedValidationSummaryByPackageVersion(
  validationSummary: ValidationSummary | undefined,
): IssuesSummary {
  const aggregatedValidationSummary: IssuesSummary = useMemo(() => {
    const emptyValidationSummary: IssuesSummary = {
      [IssueSeverities.ERROR]: 0,
      [IssueSeverities.WARNING]: 0,
      [IssueSeverities.INFO]: 0,
      [IssueSeverities.HINT]: 0,
    }
    if (!validationSummary || !validationSummary.documents) {
      return emptyValidationSummary
    }
    return validationSummary.documents.reduce((aggregated, currentSummaryRecord) => {
      const summary = currentSummaryRecord.issuesSummary
      if (!summary) {
        return aggregated
      }
      aggregated[IssueSeverities.ERROR] += summary.error ?? 0
      aggregated[IssueSeverities.WARNING] += summary.warning ?? 0
      aggregated[IssueSeverities.INFO] += summary.info ?? 0
      aggregated[IssueSeverities.HINT] += summary.hint ?? 0
      return aggregated
    }, emptyValidationSummary)
  }, [validationSummary])

  return aggregatedValidationSummary
}
