export const IssueSeverities = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  HINT: 'hint',
} as const
export type IssueSeverity = (typeof IssueSeverities)[keyof typeof IssueSeverities]
export const ISSUE_SEVERITIES_LIST = [
  IssueSeverities.ERROR,
  IssueSeverities.WARNING,
  IssueSeverities.INFO,
  IssueSeverities.HINT,
] as const

// TODO 12.09.25 // [Tech Debt] Extract all colors to constants and/or CSS variables, then map MUI custom variants to colors
export const ISSUE_SEVERITY_COLOR_MAP: Record<IssueSeverity, string> = {
  [IssueSeverities.INFO]: 'information.main', // because 'info' is already taken by MUI
  [IssueSeverities.WARNING]: 'warning.main',
  [IssueSeverities.ERROR]: 'error.main',
  [IssueSeverities.HINT]: 'hint.main',
}
