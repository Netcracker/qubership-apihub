export const BREAKING_CHANGES = 'breaking'
export const RISKY_CHANGES = 'risky'
export const NON_BREAKING_CHANGES = 'non-breaking'
export const ANNOTATION_CHANGES = 'annotation'
export const UNCLASSIFIED_CHANGES = 'unclassified'

export type Changes =
  typeof BREAKING_CHANGES
  | typeof RISKY_CHANGES
  | typeof NON_BREAKING_CHANGES
  | typeof ANNOTATION_CHANGES
  | typeof UNCLASSIFIED_CHANGES

export type ChangeSummary =
  typeof BREAKING_CHANGES
  | typeof RISKY_CHANGES
  | typeof NON_BREAKING_CHANGES
  | typeof UNCLASSIFIED_CHANGES
