import type { ServicePublishInfo } from '@agents/entities/service-publish-info'

export const BWC_ERRORS_FILTER = 'bwc-errors'
export const NO_BWC_ERRORS_FILTER = 'no-bwc-errors'
export const NO_BASELINE_FILTER = 'no-baseline'

export type ValidationFilter =
  | typeof BWC_ERRORS_FILTER
  | typeof NO_BWC_ERRORS_FILTER
  | typeof NO_BASELINE_FILTER

export const VALIDATION_FILTER_PREDICATES: Record<ValidationFilter, (service: ServicePublishInfo) => boolean> = {
  [BWC_ERRORS_FILTER]: service => hasComparisonResult(service) && !!service.changeSummary?.breaking,
  [NO_BWC_ERRORS_FILTER]: service => hasComparisonResult(service) && service.changeSummary?.breaking === 0,
  [NO_BASELINE_FILTER]: ({ baselineFound, baselineVersionFound }) => !baselineVersionFound || !baselineFound,
}

// BWC Status shows Comparison incomplete instead of a result when the comparison failed,
// so neither BWC filter matches such a service
function hasComparisonResult({ baselineVersionFound, changelogHasErrors }: ServicePublishInfo): boolean {
  return baselineVersionFound && !changelogHasErrors
}
