import {
  DIFFS_AGGREGATED_META_KEY,
  Diff,
  DIFF_META_KEY,
  DiffMetaRecord,
} from '@netcracker/qubership-apihub-api-diff'

export type KeyOfConstType<T> = T[keyof T]

export type OperationsApiType = 'rest' | 'graphql' | 'asyncapi'
export type PackageId = string
export type FileId = string
export type TemplatePath = string
export type VersionId = string | `${string}@${number}`
export type OperationId = string

//TODO: move to api-diff types
export type WithDiffMetaRecord<T extends object> = T & {[DIFF_META_KEY]?: DiffMetaRecord}
// `aggregateDiffsWithRollup` stores a Set under this key, and only on nodes that have rolled-up diffs —
// so it matches api-diff's `Set<Diff> | undefined` (optional, not an array).
export type WithAggregatedDiffs<T extends object> = T & {[DIFFS_AGGREGATED_META_KEY]?: Set<Diff>}
