export { COMPARE_MODE_DEFAULT, COMPARE_MODE_OPERATION } from './types'

export {
  ClassifierType, DiffAction, DIFF_META_KEY, breaking, nonBreaking, unclassified, annotation, deprecated, risky,
} from './core'

export { apiDiff } from './api'
export type {
  CompareResult,
  CompareOptions,
  DiffType,
  ActionType,
  Diff,
  DiffAdd,
  DiffRemove,
  DiffReplace,
  DiffRename,
  DiffMetaRecord,
} from './types'

export {
  isDiffAdd,
  isDiffRemove,
  isDiffRename,
  isDiffReplace,
} from './utils'
export { onlyExistedArrayIndexes } from './utils'
