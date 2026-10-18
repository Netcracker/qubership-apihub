import { DiffMetaKeys } from '../../../building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys'
import { BuildingServiceLogger } from '../../../loggers'

export type JsoTreeBuilderParams = {
  source: unknown
  supportJsonSchema?: boolean
  logger?: BuildingServiceLogger
  /** When set, simple nodes at this data depth defer children until materializeChildren(). */
  materializeDepth?: number
}

export type JsoTreeWithDiffsBuilderParams = {
  source: unknown
  diffsMetaKeys: DiffMetaKeys
  supportJsonSchema?: boolean
  referenceNamePropertyKey?: symbol
  logger?: BuildingServiceLogger
}

export const DEFAULT_JSO_REFERENCE_NAME_PROPERTY_KEY = Symbol('referenceName')
