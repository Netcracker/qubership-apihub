// `status` of a jdiff element row
export const JdiffStatuses = {
  UNCHANGED: 'UNCHANGED',
  NEW: 'NEW',
  REMOVED: 'REMOVED',
  MODIFIED: 'MODIFIED',
} as const

export type JdiffStatus = typeof JdiffStatuses[keyof typeof JdiffStatuses]
