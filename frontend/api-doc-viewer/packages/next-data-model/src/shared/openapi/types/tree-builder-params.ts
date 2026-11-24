import { DiffMetaKeys } from '../../../building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys'
import { BuildingServiceLogger } from '../../../loggers'
import { OpenApiOperationKeys } from './operation-keys'

export type OpenApiTreeBuilderParams = {
  /** Normalized OpenAPI 3.0 / 3.1 document. */
  source: unknown
  operationKeys?: OpenApiOperationKeys
  logger?: BuildingServiceLogger
}

export type OpenApiTreeWithDiffsBuilderParams = OpenApiTreeBuilderParams & {
  /** Merged `apiDiff` document of two whole OpenAPI documents. */
  source: unknown
  diffsMetaKeys: DiffMetaKeys
}
