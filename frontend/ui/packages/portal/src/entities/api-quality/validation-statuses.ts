export const ValidationStatuses = {
  SUCCESS: 'success',
  IN_PROGRESS: 'inProgress',
  ERROR: 'error',
} as const

export type ValidationStatus = (typeof ValidationStatuses)[keyof typeof ValidationStatuses]
