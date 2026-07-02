import { DiffMetaKeys } from '../../../building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys'
import { BuildingServiceLogger } from '../../../loggers'
import { TableKey } from './table-key'

export type DdlApiTreeBuilderParams = {
  source: unknown
  tableKey: TableKey
  logger?: BuildingServiceLogger
}

export type DdlApiTreeWithDiffsBuilderParams = {
  source: unknown
  tableKey: TableKey
  diffsMetaKeys: DiffMetaKeys
  referenceNamePropertyKey?: symbol
  logger?: BuildingServiceLogger
}

export const DEFAULT_DDL_API_REFERENCE_NAME_PROPERTY_KEY = Symbol('referenceName')
