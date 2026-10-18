export const BWC_ERRORS_FILTER = 'bwc-errors'
export const NO_BWC_ERRORS_FILTER = 'no-bwc-errors'
export const NO_BASELINE_FILTER = 'no-baseline'

export type ValidationFilter =
  typeof BWC_ERRORS_FILTER
  | typeof NO_BWC_ERRORS_FILTER
  | typeof NO_BASELINE_FILTER
