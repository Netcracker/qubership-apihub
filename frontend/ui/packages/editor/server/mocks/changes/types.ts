export const ClassifierType = {
  breaking: 'breaking',
  nonBreaking: 'non-breaking',
  semiBreaking: 'semi-breaking',
  annotation: 'annotation',
  unclassified: 'unclassified',
  deprecated: 'deprecated',
} as const

export type DiffType = typeof ClassifierType[keyof typeof ClassifierType]

export type ChangesSummaryDto = Record<DiffType, number>

