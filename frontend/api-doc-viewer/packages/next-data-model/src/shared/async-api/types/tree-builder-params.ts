import { DiffMetaKeys } from '../../../building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys'
import { BuildingServiceLogger } from '../../../loggers'
import { OperationKeys } from './operation-keys'

export type AsyncApiTreeBuilderParams = {
  source: unknown
  referenceNamePropertyKey: symbol
  operationKeys?: OperationKeys
  logger?: BuildingServiceLogger
}

export type AsyncApiTreeWithDiffsBuilderParams = {
  source: unknown
  referenceNamePropertyKey: symbol
  diffsMetaKeys: DiffMetaKeys
  operationKeys?: OperationKeys
  logger?: BuildingServiceLogger
}
