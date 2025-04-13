import { ClassifyRule } from '../types'

export const DIFF_META_KEY = Symbol('$diff')
export const DEFAULT_NORMALIZED_RESULT = false
export const DEFAULT_OPTION_DEFAULTS_META_KEY = Symbol('$defaults')
export const DEFAULT_OPTION_ORIGINS_META_KEY = Symbol('$origins')
export const JSO_ROOT = '#'

export const DiffAction = {
  add: 'add',
  remove: 'remove',
  replace: 'replace',
  rename: 'rename',
} as const

export const ClassifierType = {
  breaking: 'breaking',
  nonBreaking: 'non-breaking',
  risky: 'risky',
  annotation: 'annotation',
  unclassified: 'unclassified',
  deprecated: 'deprecated',
} as const

export const { breaking, nonBreaking, risky, unclassified, annotation, deprecated } = ClassifierType

// predefined classifiers
export const allNonBreaking: ClassifyRule = [nonBreaking, nonBreaking, nonBreaking]
export const allBreaking: ClassifyRule = [breaking, breaking, breaking]
export const onlyAddBreaking: ClassifyRule = [breaking, nonBreaking, nonBreaking]
export const addNonBreaking: ClassifyRule = [nonBreaking, breaking, breaking]
export const allUnclassified: ClassifyRule = [unclassified, unclassified, unclassified]
export const allAnnotation: ClassifyRule = [annotation, annotation, annotation]
export const allDeprecated: ClassifyRule = [deprecated, deprecated, deprecated]

export const ANY_COMBINER_INDEX = -1
export const ANY_COMBINER_PATH = []
