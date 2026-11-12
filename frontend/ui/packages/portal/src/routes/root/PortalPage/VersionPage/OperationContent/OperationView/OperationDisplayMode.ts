export const DEFAULT_DISPLAY_MODE = 'default'
export const COMPARE_DISPLAY_MODE = 'compare'
export const COMPARE_SAME_OPERATIONS_MODE = 'same-operations-mode'
export const COMPARE_DIFFERENT_OPERATIONS_MODE = 'different-operations-mode'
export const COMPARE_PACKAGES_MODE = 'packages-mode'
export const COMPARE_DASHBOARDS_MODE = 'dashboards-mode'

export type OperationDisplayMode =
  | typeof DEFAULT_DISPLAY_MODE
  | typeof COMPARE_DISPLAY_MODE
  | typeof COMPARE_SAME_OPERATIONS_MODE
  | typeof COMPARE_DIFFERENT_OPERATIONS_MODE
  | typeof COMPARE_PACKAGES_MODE
  | typeof COMPARE_DASHBOARDS_MODE

export function isComparisonMode(displayMode: OperationDisplayMode): boolean {
  return [
    COMPARE_DISPLAY_MODE,
    COMPARE_SAME_OPERATIONS_MODE,
    COMPARE_DIFFERENT_OPERATIONS_MODE,
    COMPARE_PACKAGES_MODE,
    COMPARE_DASHBOARDS_MODE,
  ].includes(displayMode)
}
