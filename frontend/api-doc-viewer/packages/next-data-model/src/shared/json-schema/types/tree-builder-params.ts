import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys"
import { BuildingServiceLogger } from "@apihub/next-data-model/loggers"

export type JsonSchemaTreeBuilderParams = {
  source: unknown
  /** When set, simple nodes at this data depth defer children until materializeChildren(). */
  materializeDepth?: number
  logger?: BuildingServiceLogger
}

export type JsonSchemaTreeWithDiffsBuilderParams = JsonSchemaTreeBuilderParams & {
  diffsMetaKeys: DiffMetaKeys
}
