import { DiffMetaKeys } from '../../../building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys'
import { BuildingServiceLogger } from '../../../loggers'

export type JsoTreeBuilderParams = {
  source: unknown
  supportJsonSchema?: boolean
  logger?: BuildingServiceLogger
}

export type JsoTreeWithDiffsBuilderParams = {
  source: unknown
  diffsMetaKeys: DiffMetaKeys
  supportJsonSchema?: boolean
  referenceNamePropertyKey?: symbol
  logger?: BuildingServiceLogger
}

export const DEFAULT_JSO_REFERENCE_NAME_PROPERTY_KEY = Symbol('referenceName')
